import React, { useState, useRef, useEffect } from 'react';
import { bindActionCreators } from 'redux';
import { connect, useSelector } from 'react-redux';

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
import { deletePaymentPoint, fetchPaymentPoints } from '../../actions';
import {
  DEFAULT_PAGE_SIZE, MODULE_NAME, PAYROLL_PAYMENT_POINT_ROUTE, RIGHT_PAYMENT_POINT_SEARCH, ROWS_PER_PAGE_OPTIONS,
} from '../../constants';
import { mutationLabel, pageTitle } from '../../utils/string-utils';
import PaymentPointFilter from './PaymentPointFilter';

function PaymentPointSearcher({
  fetchPaymentPoints,
  fetchingPaymentPoints,
  fetchedPaymentPoints,
  errorPaymentPoints,
  deletePaymentPoint,
  paymentPoints,
  coreConfirm,
  clearConfirm,
  pageInfo,
  totalCount,
  confirmed,
  submittingMutation,
  mutation,
}) {
  const history = useHistory();
  const modulesManager = useModulesManager();
  const { formatMessage, formatMessageWithValues } = useTranslations(MODULE_NAME, modulesManager);
  const rights = useSelector((store) => store.core.user.i_user.rights ?? []);

  const [paymentPointToDelete, setPaymentPointToDelete] = useState(null);
  const [deletedPaymentPointUuids, setDeletedPaymentPointUuids] = useState([]);
  const prevSubmittingMutationRef = useRef();

  const openDeletePaymentPointConfirmDialog = () => {
    coreConfirm(
      formatMessageWithValues('paymentPoint.delete.confirm.title', pageTitle(paymentPointToDelete)),
      formatMessage('paymentPoint.delete.confirm.message'),
    );
  };

  useEffect(() => paymentPointToDelete && openDeletePaymentPointConfirmDialog(), [paymentPointToDelete]);

  useEffect(() => {
    if (paymentPointToDelete && confirmed) {
      deletePaymentPoint(
        paymentPointToDelete,
        formatMessageWithValues('paymentPoint.mutation.deleteLabel', mutationLabel(paymentPointToDelete)),
      );
      setDeletedPaymentPointUuids([...deletedPaymentPointUuids, paymentPointToDelete.id]);
    }
    if (paymentPointToDelete && confirmed !== null) {
      setPaymentPointToDelete(null);
    }
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
    'paymentPoint.name',
    'paymentPoint.ppm',
    'paymentPoint.location',
    'emptyLabel',
  ];

  const sorts = () => [
    ['name', true],
    ['ppm', true],
    ['location', true],
  ];

  const fetch = (params) => fetchPaymentPoints(modulesManager, params);

  const rowIdentifier = (paymentPoint) => paymentPoint.id;

  const openPaymentPoint = (paymentPoint) => rights.includes(RIGHT_PAYMENT_POINT_SEARCH) && history.push(
    `/${modulesManager.getRef(PAYROLL_PAYMENT_POINT_ROUTE)}/${paymentPoint?.id}`,
  );

  const onDelete = (paymentPoint) => setPaymentPointToDelete(paymentPoint);

  const itemFormatters = () => [
    (paymentPoint) => paymentPoint.name,
    ({ ppm }) => `${ppm?.username} ${ppm?.iUser?.lastName} ${ppm?.iUser?.otherNames}`,
    ({ location }) => `${location?.code} ${location?.name}`,
    (paymentPoint) => (
      <Tooltip title={formatMessage('tooltip.viewDetails')}>
        <IconButton
          onClick={() => openPaymentPoint(paymentPoint)}
        >
          <VisibilityIcon />
        </IconButton>
      </Tooltip>
    ),
    (paymentPoint) => (
      <Tooltip title={formatMessage('tooltip.delete')}>
        <IconButton
          onClick={() => onDelete(paymentPoint)}
          disabled={deletedPaymentPointUuids.includes(paymentPoint.id)}
        >
          <DeleteIcon />
        </IconButton>
      </Tooltip>
    ),
  ];

  const onDoubleClick = (paymentPoint) => openPaymentPoint(paymentPoint);

  const paymentPointFilter = ({ filters, onChangeFilters }) => (
    <PaymentPointFilter filters={filters} onChangeFilters={onChangeFilters} />
  );

  const defaultFilters = () => ({
    isDeleted: {
      value: false,
      filter: 'isDeleted: false',
    },
  });

  const isRowDisabled = (_, paymentPoint) => deletedPaymentPointUuids.includes(paymentPoint.id);

  return (
    <Searcher
      module="payroll"
      FilterPane={paymentPointFilter}
      fetch={fetch}
      items={paymentPoints}
      itemsPageInfo={pageInfo}
      fetchedItems={fetchedPaymentPoints}
      fetchingItems={fetchingPaymentPoints}
      errorItems={errorPaymentPoints}
      tableTitle={formatMessageWithValues('PaymentPointSearcher.results', { totalCount })}
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
  fetchingPaymentPoints: state.payroll.fetchingPaymentPoints,
  fetchedPaymentPoints: state.payroll.fetchedPaymentPoints,
  errorPaymentPoints: state.payroll.errorPaymentPoints,
  paymentPoints: state.payroll.paymentPoints,
  pageInfo: state.payroll.paymentPointsPageInfo,
  totalCount: state.payroll.paymentPointsTotalCount,
  confirmed: state.core.confirmed,
  submittingMutation: state.payroll.submittingMutation,
  mutation: state.payroll.mutation,
});

const mapDispatchToProps = (dispatch) => bindActionCreators({
  fetchPaymentPoints,
  deletePaymentPoint,
  journalize,
  clearConfirm,
  coreConfirm,
}, dispatch);

export default connect(mapStateToProps, mapDispatchToProps)(PaymentPointSearcher);
