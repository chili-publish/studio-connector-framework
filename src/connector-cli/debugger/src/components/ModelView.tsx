import { useCallback, useEffect, useMemo, useState } from 'react';
import { useApp } from '../core/AppContext';
import { useToast } from '../core/ToastContext';
import {
  methodParamsKey,
  methodParamsStorage,
} from '../core/methodParamsStorage';
import {
  DataModel,
  InvokableDataModel,
  Parameter,
  SettableDataModel,
} from '../helpers/dataModel';
import { normalizeMediaId } from '../helpers/mediaId';
import {
  metricsCollector,
  type MethodExecutionMetrics,
} from '../helpers/metricsCollector';
import {
  applyValuesToParameters,
  cloneParameters,
  denormalizeParameters,
  isSettingsModel,
} from '../helpers/parameterForm';
import ArrayBufferImage from './ArrayBufferImage';
import JsonObjectRenderer from './JsonObjectRenderer';
import { ResultsSection } from './ResultsSection';
import { ParameterInput } from './inputs';

export const ModelView = ({ dataModel }: { dataModel: DataModel }) => {
  const {
    connector,
    metadata,
    updateSettings,
    authorization,
    globalHeaders,
    runtimeOptions,
    globalQueryParams,
  } = useApp();
  const { showToast } = useToast();

  const catalogParameters = useMemo(
    () => cloneParameters(dataModel.parameters),
    [dataModel.parameters]
  );

  const settingsValues = useMemo(() => {
    if (dataModel.name === 'http-params') {
      return {
        'Authorization Header': authorization,
        Headers: globalHeaders.reduce(
          (val, header) => {
            val[header.name] = header.value;
            return val;
          },
          {} as Record<string, string>
        ),
        Query: Array.from(globalQueryParams.entries()).reduce(
          (val, [key, value]) => {
            val[key] = value;
            return val;
          },
          {} as Record<string, string>
        ),
      } as Record<string, unknown>;
    }

    if (dataModel.name === 'Runtime options') {
      return {
        'runtime-options': runtimeOptions,
      } as Record<string, unknown>;
    }

    return undefined;
  }, [
    dataModel.name,
    authorization,
    globalHeaders,
    runtimeOptions,
    globalQueryParams,
  ]);

  const [parameters, setParameters] = useState<Parameter[]>(() => {
    const next = cloneParameters(dataModel.parameters);
    if (isSettingsModel(dataModel.name) && settingsValues) {
      applyValuesToParameters(next, settingsValues);
    } else {
      const stored = methodParamsStorage.getItem<Record<string, unknown>>(
        methodParamsKey(metadata.name, dataModel.name)
      );
      if (stored) {
        applyValuesToParameters(next, stored);
      }
    }
    return next;
  });
  const [values, setValues] = useState<Record<string, unknown>>(() =>
    denormalizeParameters(parameters)
  );
  const [result, setResult] = useState<any>(undefined);
  const [metrics, setMetrics] = useState<MethodExecutionMetrics | undefined>(
    undefined
  );
  const [isInvoking, setIsInvoking] = useState(false);

  const workingModel = useMemo(
    () => ({ ...dataModel, parameters }),
    [dataModel, parameters]
  );

  const handleInputChange = useCallback(
    (changedName: string, parameter: Parameter, newValue: any) => {
      parameter.value = newValue;

      setValues((val) => {
        const next = {
          ...val,
          [changedName]: newValue,
        };
        if (!isSettingsModel(dataModel.name)) {
          methodParamsStorage.setItem(
            methodParamsKey(metadata.name, dataModel.name),
            next
          );
        }
        return next;
      });
    },
    [dataModel.name, metadata.name]
  );

  const normalizeValues = () => {
    const flattenedValues: { [key: string]: any } = {};
    for (const key in values) {
      const value = values[key];
      const parts = key.split('.');
      if (parts.length === 1) {
        flattenedValues[key] = value;
        continue;
      }
      const parent = parts[0];
      const child = parts[1];
      if (flattenedValues[parent] === undefined) {
        flattenedValues[parent] = {};
      }
      flattenedValues[parent][child] = value;
    }

    return workingModel.parameters.reduce<unknown[]>((v, param, index) => {
      let value = flattenedValues[param.name];
      if (param.componentType === 'id' && typeof value === 'string') {
        value = normalizeMediaId(value);
      }
      v[index] = value;
      return v;
    }, []);
  };

  const handleInvoke = async () => {
    const normalizedValues = normalizeValues();
    setMetrics(undefined);
    setIsInvoking(true);
    const session = metricsCollector.startSession(dataModel.name);
    let success = true;
    let error: string | undefined;

    try {
      const invokeResult = await (workingModel as InvokableDataModel).invoke(
        normalizedValues,
        connector
      );
      setResult(invokeResult);
    } catch (err) {
      success = false;
      error = `${err}`;
      setResult({
        message: `failed to invoke ${
          dataModel.name
        }: with parameters ${JSON.stringify(normalizedValues)}: ${err}`,
        error,
      });
    } finally {
      setMetrics(session?.end({ success, error }) ?? undefined);
      setIsInvoking(false);
    }
  };

  const handleSet = () => {
    const normalizedValues = normalizeValues();
    (workingModel as SettableDataModel).set(normalizedValues, updateSettings);
    showToast('Settings were applied');
  };

  useEffect(() => {
    if (!settingsValues) {
      return;
    }
    const next = cloneParameters(catalogParameters);
    applyValuesToParameters(next, settingsValues);
    setParameters(next);
    setValues(denormalizeParameters(next));
  }, [catalogParameters, settingsValues]);

  const inputRender = (
    <form onSubmit={(event) => event.preventDefault()}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-xl">
        {parameters.map((parameter) => (
          <div key={parameter.name} className="dbg-param-card">
            <ParameterInput
              parameter={parameter}
              onChange={handleInputChange}
              parentParameter={undefined}
            />
          </div>
        ))}
      </div>
      <div className="flex flex-row gap-sm py-xl">
        {!(workingModel as InvokableDataModel).invoke ? null : (
          <button
            type="button"
            className="dbg-btn-primary"
            onClick={handleInvoke}
            disabled={isInvoking}
          >
            {isInvoking ? 'Invoking...' : 'Invoke'}
          </button>
        )}
        {!(workingModel as SettableDataModel).set ? null : (
          <button type="button" className="dbg-btn-primary" onClick={handleSet}>
            Set
          </button>
        )}
      </div>
    </form>
  );

  let resultRender = null;

  if (result !== undefined) {
    if (result.error) {
      resultRender = <JsonObjectRenderer data={result} isError />;
    } else {
      const invokableDataModel = workingModel as InvokableDataModel;
      if (invokableDataModel.returnJson || invokableDataModel.returnJsonArray) {
        resultRender = <JsonObjectRenderer data={result} />;
      } else if (invokableDataModel.returnsImage) {
        resultRender = (
          <div className="dbg-image-frame">
            <ArrayBufferImage
              id={result.id}
              width={'100%'}
              height={'100%'}
            />
          </div>
        );
      }
    }
  }

  return (
    <div className="flex-1 flex flex-col overflow-y-auto">
      <div className="bg-surface-card p-0 flex flex-col flex-1 overflow-y-auto">
        <div className="mb-md border-b border-border-subtle pb-md">
          <h1 className="capitalize text-header text-text-primary">
            {dataModel.displayName ?? dataModel.name}
          </h1>
        </div>
        {inputRender}
        <ResultsSection metrics={metrics}>{resultRender}</ResultsSection>
      </div>
    </div>
  );
};
