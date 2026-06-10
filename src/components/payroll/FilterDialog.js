import React, { useEffect, useState, useRef } from 'react';
import { injectIntl } from 'react-intl';
import Button from '@material-ui/core/Button';
import { Grid, Divider, Typography } from '@material-ui/core';
import {
  decodeId,
  formatMessage,
  fetchCustomFilter,
  PublishedComponent,
} from '@openimis/fe-core';
import { withTheme, withStyles } from '@material-ui/core/styles';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import AddCircle from '@material-ui/icons/Add';
import _ from 'lodash';
import AdvancedFiltersRowValue from './AdvancedFiltersRowValue';
import { BENEFIT_PLAN } from '../../constants';
import { isBase64Encoded } from '../../utils/advanced-filters-utils';

const styles = (theme) => ({
  item: theme.paper?.item ?? {},
  section: {
    paddingLeft: '10px',
  },
});

function FilterDialog({
  intl,
  classes,
  object,
  objectToSave,
  fetchCustomFilter,
  customFilters,
  moduleName,
  objectType,
  updateAttribute,
  readOnly,
  additionalParams,
  benefitPlanId,
}) {
  const [selectedProjects, setSelectedProjects] = useState([]);
  const [selectedLocations, setSelectedLocations] = useState([]);
  const [advancedFilters, setAdvancedFilters] = useState([]);
  const isInitializing = useRef(true);

  useEffect(() => {
    if (objectToSave?.jsonExt) {
      const jsonData = JSON.parse(objectToSave.jsonExt);

      const filterCriteria = jsonData.filter_criteria || {};
      const projectIds = filterCriteria.project_ids || [];
      setSelectedProjects(projectIds.map((id) => ({ id })));

      const locationIds = filterCriteria.location_ids || [];
      setSelectedLocations(locationIds.map((uuid) => ({ uuid })));

      const advancedCriteria = jsonData.advanced_criteria || [];
      const transformedCriteria = advancedCriteria.map((criterion) => {
        const customFilterCondition = criterion.custom_filter_condition;
        const [field, filter, typeValue] = customFilterCondition.split('__');
        const [type, value] = typeValue.split('=');
        return {
          customFilterCondition,
          field,
          filter,
          type,
          value,
        };
      });
      setAdvancedFilters(transformedCriteria);
    }
    isInitializing.current = false;
  }, [objectToSave?.jsonExt]);

  const updateJsonExt = (projects, locations, filters) => {
    let jsonData = {};
    if (objectToSave?.jsonExt) {
      jsonData = JSON.parse(objectToSave.jsonExt);
    }

    const filterCriteria = {};
    if (projects && projects.length > 0) {
      filterCriteria.project_ids = projects.map((p) => p.id);
    }
    if (locations && locations.length > 0) {
      filterCriteria.location_ids = locations.map((l) => l.uuid);
    }

    if (Object.keys(filterCriteria).length > 0) {
      jsonData.filter_criteria = filterCriteria;
    } else {
      delete jsonData.filter_criteria;
    }

    if (filters && filters.length > 0) {
      jsonData.advanced_criteria = filters.map(({
        filter, value, field, type,
      }) => ({
        custom_filter_condition: `${field}__${filter}__${type}=${value}`,
      }));
    } else {
      delete jsonData.advanced_criteria;
    }

    updateAttribute('jsonExt', JSON.stringify(jsonData));
  };

  useEffect(() => {
    if (isInitializing.current) {
      return;
    }
    updateJsonExt(selectedProjects, selectedLocations, advancedFilters);
  }, [selectedProjects, selectedLocations, advancedFilters]);

  const handleProjectsChange = (projects) => {
    setSelectedProjects(projects || []);
  };

  const handleLocationsChange = (locations) => {
    setSelectedLocations(locations || []);
  };

  const handleAdvancedFiltersChange = (filters) => {
    setAdvancedFilters(filters);
  };

  const handleAddFilter = () => {
    const newFilters = [
      ...advancedFilters,
      {
        field: '', filter: '', type: '', value: '',
      },
    ];
    handleAdvancedFiltersChange(newFilters);
  };

  const handleRemoveAllFilters = () => {
    setSelectedProjects([]);
    setSelectedLocations([]);
    setAdvancedFilters([]);
  };

  const createParams = (moduleName, objectTypeName, uuidOfObject = null, additionalParams = null) => {
    const params = [
      `moduleName: "${moduleName}"`,
      `objectTypeName: "${objectTypeName}"`,
    ];
    if (uuidOfObject) {
      params.push(`uuidOfObject: "${uuidOfObject}"`);
    }
    if (additionalParams) {
      params.push(`additionalParams: ${JSON.stringify(JSON.stringify(additionalParams))}`);
    }
    return params;
  };

  useEffect(() => {
    if (object && _.isEmpty(object) === false) {
      let paramsToFetchFilters = [];
      if (objectType === BENEFIT_PLAN) {
        paramsToFetchFilters = createParams(
          moduleName,
          objectType,
          isBase64Encoded(object.id) ? decodeId(object.id) : object.id,
          additionalParams,
        );
      } else {
        paramsToFetchFilters = createParams(
          moduleName,
          objectType,
          additionalParams,
        );
      }
      fetchCustomFilter(paramsToFetchFilters);
    }
  }, [object?.id]);

  return (
    <>
      <div className={classes.section}>
        <div className={classes.item}>
          <Typography variant="subtitle2">
            {formatMessage(intl, 'payroll', 'payroll.filterCriteria')}
          </Typography>
          { readOnly
            ? formatMessage(intl, 'payroll', 'payroll.filterCriteria.readonly')
            : formatMessage(intl, 'payroll', 'payroll.filterCriteria.tip') }
        </div>
      </div>
      <Grid container className={classes.item} style={{ paddingTop: 0 }}>
        <Grid item xs={6} className={classes.item}>
          <PublishedComponent
            pubRef="socialProtection.ProjectPicker"
            benefitPlanId={benefitPlanId}
            status="COMPLETED"
            value={selectedProjects}
            onChange={handleProjectsChange}
            readOnly={readOnly}
            multiple
            withLabel
            withPlaceholder
          />
        </Grid>
        <Grid item xs={6} className={classes.item}>
          <PublishedComponent
            pubRef="location.LocationCascader"
            value={selectedLocations}
            onChange={handleLocationsChange}
            readOnly={readOnly}
            multiple
            label={formatMessage(intl, 'payroll', 'filterCriteria.locations')}
          />
        </Grid>
      </Grid>

      <Divider />

      <div className={classes.section}>
        <div className={classes.item}>
          <Typography variant="subtitle2">
            {formatMessage(intl, 'contributionPlan', 'paymentPlan.advancedCriteria')}
          </Typography>
          {!readOnly && (
            formatMessage(intl, 'payroll', 'payroll.advancedCriteria.tip')
          )}
          {readOnly && advancedFilters.length === 0 && (
            formatMessage(intl, 'payroll', 'payroll.advancedCriteria.none')
          )}
        </div>
      </div>
      {advancedFilters.map((filter, index) => (
        <div className={classes.item}>
          <AdvancedFiltersRowValue
            customFilters={customFilters}
            currentFilter={filter}
            setCurrentFilter={() => {}}
            index={index}
            filters={advancedFilters}
            setFilters={handleAdvancedFiltersChange}
            readOnly={readOnly}
          />
        </div>
      ))}
      {!readOnly && (
        <div className={classes.item} style={{ backgroundColor: '#DFEDEF', margin: '10px' }}>
          <AddCircle
            style={{
              border: 'thin solid',
              borderRadius: '40px',
              width: '16px',
              height: '16px',
              cursor: 'pointer',
            }}
            onClick={handleAddFilter}
          />
          <Button
            onClick={handleAddFilter}
            variant="outlined"
            style={{
              border: '0px',
              marginBottom: '6px',
              fontSize: '0.8rem',
            }}
          >
            {formatMessage(intl, 'payroll', 'payroll.advancedFilters.button.addFilters')}
          </Button>
          <Button
            onClick={handleRemoveAllFilters}
            variant="outlined"
            style={{
              border: '0px',
              marginBottom: '6px',
              fontSize: '0.8rem',
            }}
          >
            {formatMessage(intl, 'payroll', 'payroll.advancedFilters.button.clearAllFilters')}
          </Button>
        </div>
      )}
    </>
  );
}

const mapStateToProps = (state) => ({
  fetchingCustomFilters: state.core.fetchingCustomFilters,
  errorCustomFilters: state.core.errorCustomFilters,
  fetchedCustomFilters: state.core.fetchedCustomFilters,
  customFilters: state.core.customFilters,
});

const mapDispatchToProps = (dispatch) => bindActionCreators({
  fetchCustomFilter,
}, dispatch);

export default injectIntl(
  withTheme(withStyles(styles)(connect(mapStateToProps, mapDispatchToProps)(FilterDialog))),
);
