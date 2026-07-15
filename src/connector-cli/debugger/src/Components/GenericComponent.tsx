import { useCallback, useEffect, useState } from 'react';
import {
  DataModel,
  InvokableDataModel,
  Parameter,
  SettableDataModel,
} from '../Helpers/DataModel';
import { normalizeConnectorId } from '../Helpers/connectorId';
import {
  metricsCollector,
  type MethodExecutionMetrics,
} from '../Helpers/MetricsCollector';
import ArrayBufferImage from './ImageFromBuffer';
import JsonObjectRenderer from './JsonObjectRenderer';
import { ResultsSection } from './ResultsSection';
import { ParameterInput } from './ParameterInput';

export const GenericComponent = ({ dataModel }: { dataModel: DataModel }) => {
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [result, setResult] = useState<any>(undefined);
  const [metrics, setMetrics] = useState<MethodExecutionMetrics | undefined>(
    undefined
  );
  const [isInvoking, setIsInvoking] = useState(false);

  const handleInputChange = useCallback(
    (changedName: string, parameter: Parameter, newValue: any) => {
      const value = newValue;
      const name = changedName;

      parameter.value = value;

      setValues((val) => ({
        ...val,
        [name]: value,
      }));
    },
    []
  );

  const denormalizeValues = useCallback(() => {
    return dataModel.parameters.reduce(
      (val, p) => {
        if (p.componentType === 'complex') {
          p.complex
            .filter((cp) => cp.value !== undefined)
            .forEach((cp) => {
              val[`${p.name}.${cp.name}`] = cp.value;
            });
        } else if (p.value) {
          val[p.name] = p.value;
        }
        return val;
      },
      {} as Record<string, unknown>
    );
  }, [dataModel.parameters]);

  useEffect(() => {
    setValues(denormalizeValues());
  }, [denormalizeValues]);

  const normalizeValues = () => {
    // in the values we will find something like {"orderType.id": "dsfadf","orderType.name": "dsfaasdf","orderId": "dasfadsf"}
    // we want to flatten this to {"orderType": {"id": "dsfadf","name": "dsfaasdf"},"orderId": "dasfadsf"}
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

    // Extract from "values" only required params an pass them in
    // appropriate order
    return dataModel.parameters.reduce<unknown[]>((v, param, index) => {
      let value = flattenedValues[param.name];
      if (param.componentType === 'id' && typeof value === 'string') {
        value = normalizeConnectorId(value);
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
      const result = await (dataModel as InvokableDataModel).invoke(
        normalizedValues
      );
      setResult(result);
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
    (dataModel as SettableDataModel).set(normalizedValues);
  };

  const inputRender = (
    <form onSubmit={(event) => event.preventDefault()}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {dataModel.parameters.map((parameter) => (
          <div
            key={parameter.name}
            className="w-full border flex-grow px-5 py-5"
          >
            <ParameterInput
              parameter={parameter}
              onChange={handleInputChange}
              parentParameter={undefined}
            />
          </div>
        ))}
      </div>
      {!(dataModel as InvokableDataModel).invoke ? null : (
        <div className="flex flex-row py-8">
          <button
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 border border-blue-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleInvoke}
            disabled={isInvoking}
          >
            {isInvoking ? 'Invoking...' : 'Invoke'}
          </button>
        </div>
      )}
      {!(dataModel as SettableDataModel).set ? null : (
        <div className="flex flex-row py-8">
          <button
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 border border-blue-700 rounded"
            onClick={handleSet}
          >
            Set
          </button>
        </div>
      )}
    </form>
  );

  let resultRender = null;

  if (result !== undefined) {
    if (result.error) {
      resultRender = <JsonObjectRenderer data={result} isError />;
    } else {
      const invokableDataModel = dataModel as InvokableDataModel;
      if (invokableDataModel.returnJson || invokableDataModel.returnJsonArray) {
        resultRender = <JsonObjectRenderer data={result} />;
      } else if (invokableDataModel.returnsImage) {
        resultRender = (
          <div className="flex justify-center rounded-lg bg-slate-50 border border-slate-100 p-4">
            <ArrayBufferImage
              buffer={result.id}
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
      <div className="bg-white p-0 flex flex-col flex-1 overflow-y-auto">
        <div className="mb-4 border-b pb-4">
          <h1 className="capitalize text-xl font-semibold text-slate-900">
            {dataModel.displayName ?? dataModel.name}
          </h1>
        </div>
        {inputRender}
        <ResultsSection metrics={metrics}>{resultRender}</ResultsSection>
      </div>
    </div>
  );
};
