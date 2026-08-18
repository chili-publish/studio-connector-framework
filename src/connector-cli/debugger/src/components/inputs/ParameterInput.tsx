import { useCallback, useEffect, useId, type ClipboardEvent } from 'react';
import { NumberParameter, Parameter } from '../../helpers/dataModel';
import { normalizeConnectorId } from '../../helpers/connectorId';
import { ParameterDictionaryInput } from './ParameterDictionaryInput';
import { ParameterListInput } from './ParameterListInput';

export const ParameterInput = ({
  parentParameter,
  parameter,
  onChange,
}: {
  parentParameter: Parameter | undefined;
  parameter: Parameter;
  onChange: (name: string, parameter: Parameter, value: any) => void;
}) => {
  const inputId = useId();

  const handleInputChange = useCallback(
    (value: string | number | boolean) => {
      if (parentParameter !== undefined) {
        onChange(
          parentParameter?.name + '.' + parameter.name,
          parameter,
          value
        );
        return;
      }
      onChange(parameter.name, parameter, value);
    },
    [parentParameter, parameter, onChange]
  );

  const handleListChange = (value: string[]) => {
    if (parentParameter !== undefined) {
      onChange(parentParameter?.name + '.' + parameter.name, parameter, value);
      return;
    }
    onChange(parameter.name, parameter, value);
  };

  const handleDictionaryChange = (value: Record<string, string>) => {
    if (parentParameter !== undefined) {
      onChange(parentParameter?.name + '.' + parameter.name, parameter, value);
      return;
    }
    onChange(parameter.name, parameter, value);
  };

  useEffect(() => {
    if (
      parameter.value !== undefined &&
      parameter.value !== null &&
      ['text', 'id', 'number', 'boolean'].includes(parameter.componentType)
    ) {
      handleInputChange(parameter.value);
    }
  }, [parameter.value, parameter.componentType, handleInputChange]);

  const handleIdPaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const pasted = event.clipboardData.getData('text');
    if (!pasted) {
      return;
    }

    const normalized = normalizeConnectorId(pasted);
    if (normalized !== pasted.trim()) {
      event.preventDefault();
      handleInputChange(normalized);
    }
  };

  switch (parameter.componentType) {
    case 'text':
      return (
        <div className="w-full">
          <label htmlFor={inputId} className="dbg-label">
            {parameter.name}
          </label>
          <input
            id={inputId}
            className="dbg-input"
            name={parameter.name}
            type="text"
            placeholder={parameter.name}
            onChange={(e) => handleInputChange(e.target.value)}
            value={parameter.value ?? ''}
          />
        </div>
      );
    case 'id':
      return (
        <div className="w-full">
          <label htmlFor={inputId} className="dbg-label">
            {parameter.name}
          </label>
          <input
            id={inputId}
            className="dbg-input"
            name={parameter.name}
            type="text"
            placeholder={parameter.name}
            onChange={(e) => handleInputChange(e.target.value)}
            onBlur={(e) => {
              const normalized = normalizeConnectorId(e.target.value);
              if (normalized !== e.target.value) {
                handleInputChange(normalized);
              }
            }}
            onPaste={handleIdPaste}
            value={parameter.value ?? ''}
          />
        </div>
      );
    case 'boolean':
      return (
        <div className="w-full">
          <label htmlFor={inputId} className="dbg-label">
            {parameter.name}
          </label>
          <input
            id={inputId}
            className="dbg-checkbox"
            name={parameter.name}
            type="checkbox"
            onChange={(e) => handleInputChange(e.target.checked)}
            checked={Boolean(parameter.value)}
          />
        </div>
      );
    case 'number':
      return (
        <div className="w-full">
          <label htmlFor={inputId} className="dbg-label">
            {parameter.name}
          </label>
          <input
            id={inputId}
            className="dbg-input"
            name={parameter.name}
            type="number"
            onChange={(e) => handleInputChange(Number(e.target.value))}
            value={parameter.value ?? ''}
            min={(parameter as NumberParameter).min}
            max={(parameter as NumberParameter).max}
          />
        </div>
      );
    case 'select':
      return (
        <div className="w-full">
          <label htmlFor={inputId} className="dbg-label">
            {parameter.name}
          </label>
          <select
            id={inputId}
            className="dbg-input"
            name={parameter.name}
            onChange={(e) => handleInputChange(e.target.value)}
            value={parameter.value ?? ''}
          >
            <option value="" disabled>
              [Select]
            </option>
            {parameter.options?.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
      );

    case 'list':
      return (
        <div className="w-full flex flex-col gap-sm">
          <h3 className="capitalize text-header text-text-primary">
            {parameter.name}
          </h3>
          <ParameterListInput
            parameter={parameter}
            onChange={handleListChange}
            parentParameter={parameter}
          />
        </div>
      );
    case 'complex':
      return (
        <div className="w-full flex flex-col gap-md">
          <h3 className="capitalize text-header text-text-primary">
            {parameter.name}
          </h3>
          <div className="w-full flex flex-col gap-md">
            {parameter.complex?.map((complexParameter) => (
              <ParameterInput
                key={complexParameter.name}
                parameter={complexParameter}
                onChange={onChange}
                parentParameter={parameter}
              />
            ))}
          </div>
        </div>
      );
    case 'dictionary':
      return (
        <div className="w-full flex flex-col gap-sm">
          <h3 className="capitalize text-header text-text-primary">
            {parameter.name}
          </h3>
          <ParameterDictionaryInput
            parameter={parameter}
            onChange={handleDictionaryChange}
            parentParameter={undefined}
          />
        </div>
      );
  }
};
