import React, { useState } from 'react';
import { DictionaryParameter, Parameter } from '../../helpers/dataModel';
import { TrashIcon } from '../icons';

type DictionaryItem = { key: string; value: string };

const emptyRow = (): DictionaryItem => ({ key: '', value: '' });

function itemsFromValue(
  value: Record<string, string> | undefined
): DictionaryItem[] {
  if (value === undefined) {
    return [emptyRow()];
  }

  const entries = Object.entries(value).map(([key, entryValue]) => ({
    key,
    value: entryValue,
  }));

  // Show one placeholder row when the dictionary starts empty
  // (e.g. HTTP headers, query params, or runtime options with no value).
  return entries.length > 0 ? entries : [emptyRow()];
}

function toRecord(items: DictionaryItem[]): Record<string, string> {
  const record: Record<string, string> = {};
  for (const item of items) {
    if (item.key === '' && item.value === '') {
      continue;
    }
    record[item.key] = item.value;
  }
  return record;
}

export const ParameterDictionaryInput = ({
  parameter,
  onChange,
}: {
  parentParameter: Parameter | undefined;
  parameter: DictionaryParameter;
  onChange: (value: Record<string, string>) => void;
}) => {
  // this will be a table with two columns, one for the key and one for the value
  // we can add items and remove items from the list
  // use tailwindcss for the table
  // first we define the state, which is a list of key value pairs
  const [items, setItems] = useState<DictionaryItem[]>(() =>
    itemsFromValue(parameter.value)
  );

  // items will be passed to the onChange function
  const handleAdd = (
    event: React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) => {
    event.preventDefault();
    // add a new item to the list
    setItems([...items, emptyRow()]);
  };

  const handleRemove = (index: number) => {
    // remove the item from the list
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
    onChange(toRecord(newItems));
  };

  const handleKeyChange = (
    index: number,
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    // update the key of the item
    const newItems = [...items];
    newItems[index] = { ...newItems[index], key: event.target.value };
    setItems(newItems);
    onChange(toRecord(newItems));
  };

  const handleValueChange = (
    index: number,
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    // update the value of the item
    const newItems = [...items];
    newItems[index] = { ...newItems[index], value: event.target.value };
    setItems(newItems);
    onChange(toRecord(newItems));
  };

  return (
    <>
      <div className="overflow-hidden">
        <div className="dbg-table-wrap">
          <table className="dbg-table">
            <thead>
              <tr>
                <th scope="col">Key</th>
                <th scope="col">Value</th>
                {parameter.restrictModification ? null : (
                  <th scope="col" className="w-14"></th>
                )}
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={index}>
                  <td>
                    <input
                      className="dbg-input"
                      type="text"
                      value={item.key}
                      placeholder="Enter key"
                      onChange={(event) => handleKeyChange(index, event)}
                    />
                  </td>
                  <td>
                    <input
                      className="dbg-input"
                      type="text"
                      value={item.value}
                      placeholder="Enter value"
                      onChange={(event) => handleValueChange(index, event)}
                    />
                  </td>
                  {parameter.restrictModification ? null : (
                    <td className="w-14 text-center">
                      <button
                        type="button"
                        className="dbg-btn-danger-icon"
                        aria-label="Remove"
                        title="Remove"
                        onClick={() => handleRemove(index)}
                      >
                        <TrashIcon />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {parameter.restrictModification ? null : (
            <div className="px-lg py-md">
              <button
                type="button"
                className="dbg-btn-secondary"
                onClick={handleAdd}
              >
                Add
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
