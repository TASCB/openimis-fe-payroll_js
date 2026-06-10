import React, { useState } from 'react';
import { Grid, Typography } from '@material-ui/core';
import { injectIntl } from 'react-intl';
import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import {
  formatMessage,
} from '@openimis/fe-core';
import { withTheme, withStyles } from '@material-ui/core/styles';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';

const styles = (theme) => ({
  item: theme.paper?.item ?? {},
  valueRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: theme.spacing(1, 0),
    borderBottom: '1px solid #d8e4e6',
  },
  valueLabel: {
    fontWeight: 600,
    marginRight: theme.spacing(2),
    textTransform: 'capitalize',
  },
  valueContent: {
    textAlign: 'right',
  },
});

function AdditionalFieldsDialog({
  intl,
  classes,
  jsonExt,
  buttonLabel,
  title,
}) {
  const [isOpen, setIsOpen] = useState(false);

  const handleOpen = () => {
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const parseJsonExt = () => {
    if (!jsonExt) return {};
    if (typeof jsonExt === 'string') {
      try {
        return JSON.parse(jsonExt);
      } catch (e) {
        return {};
      }
    }
    return jsonExt;
  };

  const buildDisplayPayload = (parsedJsonExt) => {
    if (parsedJsonExt?.extra_info && Object.keys(parsedJsonExt.extra_info).length > 0) {
      return parsedJsonExt.extra_info;
    }

    if (parsedJsonExt?.pct_breakdown) {
      const breakdown = parsedJsonExt.pct_breakdown;
      return {
        base_amount: breakdown.base_amount,
        has_disability: breakdown.has_disability,
        disability_amount: breakdown.disability_amount,
        young_child_count: breakdown.young_child_count,
        young_child_amount: breakdown.young_child_amount,
        primary_count: breakdown.primary_count,
        primary_amount: breakdown.primary_amount,
        secondary_count: breakdown.secondary_count,
        secondary_amount: breakdown.secondary_amount,
        capped_total: breakdown.capped_total,
      };
    }

    return parsedJsonExt;
  };

  const parsedJsonExt = parseJsonExt();
  const displayPayload = buildDisplayPayload(parsedJsonExt);
  const entries = Object.entries(displayPayload || {}).filter(([, value]) => value !== undefined && value !== null);

  const formatLabel = (key) => {
    if (key === 'base_amount') {
      return 'Direct Support';
    }

    return key
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (match) => match.toUpperCase());
  };

  return (
    <>
      <Button
        onClick={handleOpen}
        variant="outlined"
        color="#DFEDEF"
        className={classes.button}
        style={{
          border: '0px',
          marginTop: '6px',
        }}
      >
        {formatMessage(intl, 'payroll', buttonLabel)}
      </Button>
      <Dialog
        open={isOpen}
        onClose={handleClose}
        PaperProps={{
          style: {
            width: 1200,
            maxWidth: 1200,
            maxHeight: 900,
          },
        }}
      >
        <form noValidate>
          <DialogTitle
            style={{
              marginTop: '10px',
            }}
          >
            {formatMessage(intl, 'payroll', title)}
          </DialogTitle>
          <DialogContent>
            <div
              style={{ backgroundColor: '#DFEDEF', paddingLeft: '10px', paddingBottom: '10px' }}
            >
              <Grid container className={classes.item}>
                {entries.length === 0 && (
                  <Grid item xs={12} className={classes.item}>
                    <Typography>No additional breakdown available.</Typography>
                  </Grid>
                )}
                {entries.map(([key, value]) => (
                  <Grid item xs={12} className={classes.item} key={key}>
                    <div className={classes.valueRow}>
                      <Typography className={classes.valueLabel}>{formatLabel(key)}</Typography>
                      <Typography className={classes.valueContent}>
                        {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)}
                      </Typography>
                    </div>
                  </Grid>
                ))}
              </Grid>
            </div>
          </DialogContent>
          <DialogActions
            style={{
              display: 'inline',
              paddingLeft: '10px',
              marginTop: '25px',
              marginBottom: '15px',
            }}
          >
            <div style={{ maxWidth: '1000px' }}>
              <div style={{ float: 'left' }}>
                <Button
                  onClick={handleClose}
                  variant="outlined"
                  autoFocus
                  style={{
                    margin: '0 16px',
                    marginBottom: '15px',
                  }}
                >
                  {formatMessage(intl, 'payroll', 'payroll.additonalFields.close')}
                </Button>
              </div>
              <div style={{ float: 'right', paddingRight: '16px' }} />
            </div>
          </DialogActions>
        </form>
      </Dialog>
    </>
  );
}

const mapStateToProps = (state) => ({
  rights: !!state.core && !!state.core.user && !!state.core.user.i_user ? state.core.user.i_user.rights : [],
});

const mapDispatchToProps = (dispatch) => bindActionCreators({
}, dispatch);

export default injectIntl(
  withTheme(
    withStyles(styles)(
      connect(mapStateToProps, mapDispatchToProps)(AdditionalFieldsDialog),
    ),
  ),
);
