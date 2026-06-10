import React, { useState, useRef, useEffect } from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';

import { makeStyles } from '@material-ui/styles';
import DeleteIcon from '@material-ui/icons/Delete';

import {
  Form,
  useHistory,
  useModulesManager,
  useTranslations,
  coreConfirm,
  clearConfirm,
  journalize,
} from '@openimis/fe-core';
import {
  clearPaymentPoint,
  createPaymentPoint,
  deletePaymentPoint,
  fetchPaymentPoint,
  updatePaymentPoint,
} from '../../actions';
import {
  MODULE_NAME,
  RIGHT_PAYMENT_POINT_UPDATE,
} from '../../constants';
import { ACTION_TYPE } from '../../reducer';
import { mutationLabel, pageTitle } from '../../utils/string-utils';
import PaymentPointHeadPanel from './PaymentPointHeadPanel';

const useStyles = makeStyles((theme) => ({
  page: theme.page,
  lockedPage: theme.page?.locked ?? {},
}));

function PaymentPointPage({
  clearPaymentPoint,
  createPaymentPoint,
  deletePaymentPoint,
  updatePaymentPoint,
  paymentPointUuid,
  fetchPaymentPoint,
  rights,
  confirmed,
  submittingMutation,
  mutation,
  paymentPoint,
  coreConfirm,
  clearConfirm,
}) {
  const modulesManager = useModulesManager();
  const classes = useStyles();
  const history = useHistory();
  const { formatMessage, formatMessageWithValues } = useTranslations(MODULE_NAME, modulesManager);

  const [editedPaymentPoint, setEditedPaymentPoint] = useState({});
  const [confirmedAction, setConfirmedAction] = useState(() => null);
  const prevSubmittingMutationRef = useRef();
  const pageLocked = editedPaymentPoint?.isDeleted;

  const back = () => history.goBack();

  useEffect(() => {
    if (paymentPointUuid) {
      fetchPaymentPoint(modulesManager, [`id: "${paymentPointUuid}"`]);
    }
  }, [paymentPointUuid]);

  useEffect(() => {
    if (confirmed) confirmedAction();
    return () => confirmed && clearConfirm(null);
  }, [confirmed]);

  useEffect(() => {
    if (prevSubmittingMutationRef.current && !submittingMutation) {
      journalize(mutation);
      if (mutation?.actionType === ACTION_TYPE.DELETE_PAYMENT_POINT) {
        back();
      }
    }
  }, [submittingMutation]);

  useEffect(() => {
    prevSubmittingMutationRef.current = submittingMutation;
  });

  useEffect(() => setEditedPaymentPoint(paymentPoint), [paymentPoint]);

  useEffect(() => () => clearPaymentPoint(), []);

  const mandatoryFieldsEmpty = () => {
    if (
      editedPaymentPoint?.name
      && editedPaymentPoint?.location
      && editedPaymentPoint?.ppm
      && !editedPaymentPoint?.isDeleted) return false;
    return true;
  };

  const canSave = () => !mandatoryFieldsEmpty();

  const handleSave = () => {
    if (paymentPoint?.id) {
      updatePaymentPoint(
        editedPaymentPoint,
        formatMessageWithValues('paymentPoint.mutation.updateLabel', mutationLabel(paymentPoint)),
      );
    } else {
      createPaymentPoint(
        editedPaymentPoint,
        formatMessageWithValues('paymentPoint.mutation.createLabel', mutationLabel(paymentPoint)),
      );
    }
    back();
  };

  const deletePaymentPointCallback = () => deletePaymentPoint(
    paymentPoint,
    formatMessageWithValues('paymentPoint.mutation.deleteLabel', mutationLabel(paymentPoint)),
  );

  const openDeletePaymentPointConfirmDialog = () => {
    setConfirmedAction(() => deletePaymentPointCallback);
    coreConfirm(
      formatMessageWithValues('paymentPoint.delete.confirm.title', pageTitle(paymentPoint)),
      formatMessage('paymentPoint.delete.confirm.message'),
    );
  };

  const actions = [
    !!paymentPointUuid && !pageLocked && {
      doIt: openDeletePaymentPointConfirmDialog,
      icon: <DeleteIcon />,
      tooltip: formatMessage('tooltip.delete'),
    },
  ];

  return (
    rights.includes(RIGHT_PAYMENT_POINT_UPDATE) && (
    <div className={pageLocked ? classes.lockedPage : null}>
      <div className={classes.page}>
        <Form
          module="payroll"
          title={formatMessageWithValues('PaymentPointPage.title', pageTitle(paymentPoint))}
          titleParams={pageTitle(paymentPoint)}
          openDirty
          edited={editedPaymentPoint}
          onEditedChanged={setEditedPaymentPoint}
          back={back}
          mandatoryFieldsEmpty={mandatoryFieldsEmpty}
          canSave={canSave}
          save={handleSave}
          HeadPanel={PaymentPointHeadPanel}
          readOnly={pageLocked}
          rights={rights}
          actions={actions}
          setConfirmedAction={setConfirmedAction}
          saveTooltip={formatMessage('tooltip.save')}
        />
      </div>

    </div>
    )
  );
}

const mapDispatchToProps = (dispatch) => bindActionCreators({
  clearPaymentPoint,
  createPaymentPoint,
  deletePaymentPoint,
  updatePaymentPoint,
  fetchPaymentPoint,
  coreConfirm,
  clearConfirm,
  journalize,
}, dispatch);

const mapStateToProps = (state, props) => ({
  paymentPointUuid: props.match.params.payment_point_uuid,
  rights: state.core?.user?.i_user?.rights ?? [],
  confirmed: state.core.confirmed,
  submittingMutation: state.payroll.submittingMutation,
  mutation: state.payroll.mutation,
  paymentPoint: state.payroll.paymentPoint,
});

export default connect(mapStateToProps, mapDispatchToProps)(PaymentPointPage);
