import React from 'react';
import { useSelector } from 'react-redux';

import { Fab } from '@material-ui/core';
import { makeStyles } from '@material-ui/styles';
import AddIcon from '@material-ui/icons/Add';

import {
  Helmet,
  useModulesManager,
  useTranslations,
  useHistory,
  withTooltip,
} from '@openimis/fe-core';
import {
  MODULE_NAME,
  PAYROLL_PAYMENT_POINT_ROUTE,
  RIGHT_PAYMENT_POINT_CREATE,
  RIGHT_PAYMENT_POINT_SEARCH,
} from '../../constants';
import PaymentPointSearcher from '../../components/payment-point/PaymentPointSearcher';

const useStyles = makeStyles((theme) => ({
  page: theme.page,
  fab: theme.fab,
}));

function PaymentPointsPage() {
  const modulesManager = useModulesManager();
  const classes = useStyles();
  const history = useHistory();
  const rights = useSelector((store) => store.core.user.i_user.rights ?? []);
  const { formatMessage } = useTranslations(MODULE_NAME, modulesManager);

  const onCreate = () => history.push(
    `/${modulesManager.getRef(PAYROLL_PAYMENT_POINT_ROUTE)}`,
  );

  return (
    <div className={classes.page}>
      <Helmet title={formatMessage('paymentPoint.page.title')} />
      {rights.includes(RIGHT_PAYMENT_POINT_SEARCH)
        && <PaymentPointSearcher />}
      {rights.includes(RIGHT_PAYMENT_POINT_CREATE)
        && withTooltip(
          <div className={classes.fab}>
            <Fab color="primary" onClick={onCreate}>
              <AddIcon />
            </Fab>
          </div>,
          formatMessage('createButton.tooltip'),
        )}
    </div>
  );
}

export default PaymentPointsPage;
