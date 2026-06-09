import React, { useState, useRef, useEffect } from 'react';
import { connect, useSelector } from 'react-redux';
import { bindActionCreators } from 'redux';

import { IconButton, Tooltip } from '@material-ui/core';
import VisibilityIcon from '@material-ui/icons/Visibility';
import DeleteIcon from '@material-ui/icons/Delete';

import {
  Searcher,
  useHistory,
  useModulesManager,
  useTranslations,
  coreConfirm,
  clearConfirm,
  journalize,
} from '@openimis/fe-core';
import PayrollFilter from './PayrollFilter';
import {
  DEFAULT_PAGE_SIZE, MODULE_NAME, PAYROLL_PAYROLL_ROUTE,
  RIGHT_PAYROLL_SEARCH, ROWS_PER_PAGE_OPTIONS, PAYROLL_STATUS,
} from '../../constants';
import { mutationLabel, pageTitle } from '../../utils/string-utils';
import { fetchPayrolls, deletePayrolls } from '../../actions';

const resolveBenefitPlan = (payroll) => {
  if (payroll?.benefitPlan) {
    return payroll.benefitPlan;
  }

  const benefitPlanValue = payroll?.paymentPlan?.benefitPlan;
  if (!benefitPlanValue) {
    return null;
  }

  if (typeof benefitPlanValue === 'object') {
    return benefitPlanValue;
  }

  if (typeof benefitPlanValue === 'string') {
    try {
      const parsed = JSON.parse(benefitPlanValue);
      if (typeof parsed === 'string') {
        return JSON.parse(parsed);
      }
      return parsed;
    } catch (e) {
      return null;
    }
  }

  return null;
};

function PayrollSearcher({
  deletePayrolls,
  fetchingPayrolls,
  fetchedPayrolls,
  errorPayrolls,
  payrolls,
  pageInfo,
  totalCount,
  fetchPayrolls,
  coreConfirm,
  clearConfirm,
  confirmed,
  submittingMutation,
  mutation,
}) {
  const history = useHistory();
  const modulesManager = useModulesManager();
  const { formatMessage, formatMessageWithValues } = useTranslations(MODULE_NAME, modulesManager);
  const rights = useSelector((store) => store.core.user.i_user.rights ?? []);

  const [payrollToDelete, setPayrollToDelete] = useState(null);
  const [deletedPayrollUuids, setDeletedPayrollUuids] = useState([]);
  const prevSubmittingMutationRef = useRef();

  const openDeletePayrollConfirmDialog = () => {
    coreConfirm(
      formatMessageWithValues('payroll.delete.confirm.title', pageTitle(payrollToDelete)),
      formatMessage('payroll.delete.confirm.message'),
    );
  };

  useEffect(() => payrollToDelete && openDeletePayrollConfirmDialog(), [payrollToDelete]);

  useEffect(() => {
    if (payrollToDelete && confirmed) {
      deletePayrolls(
        payrollToDelete,
        formatMessageWithValues('payroll.mutation.deleteLabel', mutationLabel(payrollToDelete)),
      );
      setDeletedPayrollUuids([...deletedPayrollUuids, payrollToDelete.id]);
    }
    if (payrollToDelete && confirmed !== null) {
      setPayrollToDelete(null);
    }
    return () => confirmed && clearConfirm(false);
  }, [confirmed]);

  useEffect(() => {
    if (prevSubmittingMutationRef.current && !submittingMutation) {
      journalize(mutation);
    }
  }, [submittingMutation]);

  useEffect(() => {
    prevSubmittingMutationRef.current = submittingMutation;
  });

  const headers = () => [
    'payroll.name',
    'payroll.benefitPlan',
    'payroll.paymentPoint',
    'payroll.status',
    'payroll.paymentMethod',
    'emptyLabel',
  ];

  const sorts = () => [
    ['name', true],
    ['benefitPlan', true],
    ['paymentPoint', true],
    ['status', true],
    ['paymentMethod', true],
  ];

  const defaultFilters = () => ({
    isDeleted: {
      value: false,
      filter: 'isDeleted: false',
    },
  });

  const fetch = (params) => fetchPayrolls(modulesManager, params);

  const rowIdentifier = (payroll) => payroll.id;

  const openPayroll = (payroll) => rights.includes(RIGHT_PAYROLL_SEARCH) && history.push(
    `/${modulesManager.getRef(PAYROLL_PAYROLL_ROUTE)}/${payroll?.id}`,
  );

  const onDelete = (payroll) => setPayrollToDelete(payroll);

  const itemFormatters = () => [
    (payroll) => payroll.name,
    (payroll) => {
      const benefitPlan = resolveBenefitPlan(payroll);
      return benefitPlan ? `${benefitPlan.code} ${benefitPlan.name}` : '';
    },
    (payroll) => (payroll.paymentPoint
      ? `${payroll.paymentPoint.name}` : ''),
    (payroll) => (payroll.status
      ? `${payroll.status}` : ''),
    (payroll) => (payroll.paymentMethod
      ? `${payroll.paymentMethod}` : ''),
    (payroll) => (
      <Tooltip title={formatMessage('tooltip.viewDetails')}>
        <IconButton
          onClick={() => openPayroll(payroll)}
        >
          <VisibilityIcon />
        </IconButton>
      </Tooltip>
    ),
    (payroll) => (
      <Tooltip title={formatMessage('tooltip.delete')}>
        <IconButton
          onClick={() => onDelete(payroll)}
          disabled={deletedPayrollUuids.includes(payroll.id) || payroll.status !== PAYROLL_STATUS.PENDING_APPROVAL}
        >
          <DeleteIcon />
        </IconButton>
      </Tooltip>
    ),
  ];

  const onDoubleClick = (payroll) => openPayroll(payroll);

  const payrollFilter = ({ filters, onChangeFilters }) => (
    <PayrollFilter filters={filters} onChangeFilters={onChangeFilters} />
  );

  const isRowDisabled = (_, payroll) => deletedPayrollUuids.includes(payroll.id);

  return (
    <Searcher
      module="payroll"
      FilterPane={payrollFilter}
      fetch={fetch}
      items={payrolls}
      itemsPageInfo={pageInfo}
      fetchedItems={fetchedPayrolls}
      fetchingItems={fetchingPayrolls}
      errorItems={errorPayrolls}
      tableTitle={formatMessageWithValues('payrollSearcher.results', { totalCount })}
      headers={headers}
      itemFormatters={itemFormatters}
      sorts={sorts}
      rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
      defaultPageSize={DEFAULT_PAGE_SIZE}
      rowIdentifier={rowIdentifier}
      onDoubleClick={onDoubleClick}
      defaultFilters={defaultFilters()}
      rowDisabled={isRowDisabled}
      rowLocked={isRowDisabled}
    />
  );
}

const mapStateToProps = (state) => ({
  fetchingPayrolls: state.payroll.fetchingPayrolls,
  fetchedPayrolls: state.payroll.fetchedPayrolls,
  errorPayrolls: state.payroll.errorPayrolls,
  payrolls: state.payroll.payrolls,
  pageInfo: state.payroll.payrollsPageInfo,
  totalCount: state.payroll.payrollsTotalCount,
  confirmed: state.core.confirmed,
  submittingMutation: state.payroll.submittingMutation,
  mutation: state.payroll.mutation,
});

const mapDispatchToProps = (dispatch) => bindActionCreators({
  fetchPayrolls,
  deletePayrolls,
  journalize,
  clearConfirm,
  coreConfirm,
}, dispatch);

export default connect(mapStateToProps, mapDispatchToProps)(PayrollSearcher);
