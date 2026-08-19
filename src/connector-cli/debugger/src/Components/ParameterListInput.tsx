import React, { useState } from 'react';
import { Parameter } from '../Helpers/DataModel';
import { TrashIcon } from './TrashIcon';

export const ParameterListInput = ({
  parameter,
  onChange,
}: {
  parentParameter: Parameter | undefined;
  parameter: Parameter;
  onChange: (value: string[]) => void;
}) => {
  let initialList = [''];

  if (parameter.value !== undefined) {
    initialList = [];
    initialList.push(...parameter.value);
  }

  // we can add items and remove items from the list
  // use tailwindcss for the table
  // first we define the state, which is a list of empty value
  const [items, setItems] = useState<string[]>(initialList);

  // items will be passed to the onChange function
  const handleAdd = (
    event: React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) => {
    event.preventDefault();
    // add a new item to the list
    setItems([...items, '']);
  };

  const handleRemove = (index: number) => {
    // remove the item from the list
    setItems(items.filter((item, i) => i !== index));
  };

  const handleValueChange = (
    index: number,
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    // update the value of the item
    const newItems = [...items];
    newItems[index] = event.target.value;
    setItems(newItems);
    onChange(newItems);
  };

  return (
    <>
      <div className="overflow-hidden">
        <div className="dbg-table-wrap">
          <table className="dbg-table">
            <tbody>
              {items.map((item, index) => (
                <tr key={index}>
                  <td>
                    <input
                      className="dbg-input"
                      type="text"
                      value={item}
                      placeholder={`Enter ${parameter.name}`}
                      onChange={(event) => handleValueChange(index, event)}
                    />
                  </td>
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
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-lg py-md">
            <button
              type="button"
              className="dbg-btn-secondary"
              onClick={handleAdd}
            >
              Add
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
