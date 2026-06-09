import React, { useRef, useEffect } from 'react';
import { connect, useSelector } from 'react-redux';
import { bindActionCreators } from 'redux';

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
  DEFAULT_PAGE_SIZE, MODULE_NAME, PAYROLL_PAYROLL_ROUTE, RIGHT_PAYROLL_SEARCH, ROWS_PER_PAGE_OPTIONS, PAYROLL_STATUS,
} from '../../constants';
import { fetchPayrolls } from '../../actions';
import PaymentApproveForPaymentSummary from './dialogs/PaymentApproveForPaymentSummary';
import PayrollReconciliationFilesDialog from './dialogs/PayrollReconciliationFilesDialog';

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

function PayrollSearcherApproved({
  fetchingPayrolls,
  fetchedPayrolls,
  errorPayrolls,
  payrolls,
  pageInfo,
  totalCount,
  fetchPayrolls,
  submittingMutation,
  mutation,
  classes,
}) {
  const history = useHistory();
  const modulesManager = useModulesManager();
  const { formatMessageWithValues } = useTranslations(MODULE_NAME, modulesManager);
  const rights = useSelector((store) => store.core.user.i_user.rights ?? []);

  const prevSubmittingMutationRef = useRef();

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
    'payroll.paymentPlan',
    'payroll.paymentPoint',
    'payroll.status',
    'payroll.paymentMethod',
    'emptyLabel',
  ];

  const sorts = () => [
    ['name', true],
    ['paymentPlan', true],
    ['paymentPoint', true],
    ['status', true],
    ['paymentMethod', true],
  ];

  const defaultFilters = () => ({
    isDeleted: {
      value: false,
      filter: 'isDeleted: false',
    },
    status: {
      value: PAYROLL_STATUS.APPROVE_FOR_PAYMENT,
      filter: `status: ${PAYROLL_STATUS.APPROVE_FOR_PAYMENT}`,
    },
  });

  const fetch = (params) => fetchPayrolls(modulesManager, params);

  const rowIdentifier = (payroll) => payroll.id;

  const openPayroll = (payroll) => rights.includes(RIGHT_PAYROLL_SEARCH) && history.push(
    `/${modulesManager.getRef(PAYROLL_PAYROLL_ROUTE)}/${payroll?.id}`,
  );

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
      <PayrollReconciliationFilesDialog
        classes={classes}
        payroll={payroll}
      />
    ),
    (payroll) => (
      <PaymentApproveForPaymentSummary
        classes={classes}
        payrollDetail={payroll}
      />
    ),
  ];

  const onDoubleClick = (payroll) => openPayroll(payroll);

  const payrollFilter = ({ filters, onChangeFilters }) => (
    <PayrollFilter filters={filters} onChangeFilters={onChangeFilters} statusReadOnly />
  );

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
  journalize,
  clearConfirm,
  coreConfirm,
}, dispatch);

export default connect(mapStateToProps, mapDispatchToProps)(PayrollSearcherApproved);
