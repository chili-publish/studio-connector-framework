import React, { useState } from 'react';
import { DictionaryParameter, Parameter } from '../Helpers/DataModel';
import { TrashIcon } from './TrashIcon';

export const ParameterDictionaryInput = ({
  parameter,
  onChange,
}: {
  parentParameter: Parameter | undefined;
  parameter: DictionaryParameter;
  onChange: (value: Record<string, string>) => void;
}) => {
  let initialList = [{ key: '', value: '' }];

  if (parameter.value !== undefined) {
    initialList = [];
    for (const key in parameter.value) {
      const value = parameter.value[key];
      initialList.push({ key, value });
    }
  }

  // this will be a table with two columns, one for the key and one for the value
  // we can add items and remove items from the list
  // use tailwindcss for the table
  // first we define the state, which is a list of key value pairs
  const [items, setItems] = useState<any[]>(initialList);

  // items will be passed to the onChange function
  const handleAdd = (
    event: React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) => {
    event.preventDefault();
    // add a new item to the list
    setItems([...items, { key: '', value: '' }]);
  };

  const handleRemove = (index: number) => {
    // remove the item from the list
    const newItems = items.filter((item, i) => i !== index);
    setItems(newItems);
    // convert newItems to an object
    const newItemsObject: { [key: string]: any } = {};
    newItems.forEach((item) => {
      newItemsObject[item.key] = item.value;
    });
    onChange(newItemsObject);
  };

  const handleKeyChange = (
    index: number,
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    // update the key of the item
    const newItems = [...items];
    newItems[index].key = event.target.value;
    setItems(newItems);
    // convert newItems to an object
    const newItemsObject: { [key: string]: any } = {};
    newItems.forEach((item) => {
      newItemsObject[item.key] = item.value;
    });
    onChange(newItemsObject);
  };

  const handleValueChange = (
    index: number,
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    // update the value of the item
    const newItems = [...items];
    newItems[index].value = event.target.value;
    setItems(newItems);
    // convert newItems to an object
    const newItemsObject: { [key: string]: any } = {};
    newItems.forEach((item) => {
      newItemsObject[item.key] = item.value;
    });
    onChange(newItemsObject);
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
