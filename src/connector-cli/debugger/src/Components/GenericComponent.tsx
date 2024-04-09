import { useState } from 'react';
import { ParameterInput } from './ParameterInput';
import {
  DataModel,
  InvokableDataModel,
  Parameter,
  SettableDataModel,
} from '../Helpers/DataModel';
import JsonObjectRenderer from './JsonObjectRenderer';
import ArrayBufferImage from './ImageFromBuffer';

export const GenericComponent = ({ dataModel }: { dataModel: DataModel }) => {
  const [values, setValues] = useState<any>(undefined);
  const [result, setResult] = useState<any>(undefined);

  const handleInputChange = (
    changedName: string,
    parameter: Parameter,
    newValue: any
  ) => {
    const value = newValue;
    const name = changedName;

    parameter.value = value;

    setValues({
      ...values,
      [name]: value,
    });
  };

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

    // order flattenedValues by their occurance in dataModel.parameters
    // this is needed because the dataModel.parameters are in the correct order
    const sortedKeys = Object.keys(flattenedValues)
      .filter(
        (key) => dataModel.parameters.findIndex((p) => p.name === key) >= 0
      )
      .sort((a: any, b: any) => {
        const aIndex = dataModel.parameters.findIndex((p) => p.name === a);
        const bIndex = dataModel.parameters.findIndex((p) => p.name === b);
        return aIndex - bIndex;
      });

    // now we can create an array of values in the correct order
    // this is needed because the dataModel.invoke function expects the values in the correct order
    const sortedValues = sortedKeys.map((key) => flattenedValues[key]);
    return sortedValues;
  };

  const handleInvoke = async () => {
    const normalizedValues = normalizeValues();
    try {
      const result = await (dataModel as InvokableDataModel).invoke(
        normalizedValues
      );
      setResult(result);
      console.log('result', result);
    } catch (error) {
      setResult({
        message: `failed to invoke ${
          dataModel.name
        }: with parameters ${JSON.stringify(normalizedValues)}: ${error}`,
        error: `${error}`,
      });
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
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 border border-blue-700 rounded"
            onClick={handleInvoke}
          >
            Invoke
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
      resultRender = <JsonObjectRenderer data={result} />;
    } else {
      const invokableDataModel = dataModel as InvokableDataModel;
      if (invokableDataModel.returnJson || invokableDataModel.returnJsonArray) {
        resultRender = <JsonObjectRenderer data={result} />;
      } else if (invokableDataModel.returnsImage) {
        resultRender = (
          <ArrayBufferImage buffer={result.id} width={'100%'} height={'100%'} />
        );
      }
    }
  }

  return (
    <div className="flex-1 flex flex-col overflow-y-auto">
      <div className="bg-white p-0 flex flex-col flex-1 overflow-y-auto">
        <div className="mb-4 border-b pb-4">
          <h1 className="capitalize  text-xl font-semibold">
            {dataModel.name}
          </h1>
        </div>
        {inputRender}
        {resultRender}
      </div>
    </div>
  );
};
