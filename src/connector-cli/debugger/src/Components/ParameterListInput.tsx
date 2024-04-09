import React, { useState } from 'react';
import { Parameter } from '../Helpers/DataModel';

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
      <div className="overflow-hidden ">
        <div className="relative overflow-x-auto border">
          <table className="table-fixed w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400">
            <tbody>
              {items.map((item, index) => (
                <tr
                  className="bg-white border-b dark:bg-gray-800 dark:border-gray-700"
                  key={index}
                >
                  <td className="pl-4 py-4">
                    <input
                      className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 "
                      type="text"
                      value={item}
                      placeholder={`Enter ${parameter.name}`}
                      onChange={(event) => handleValueChange(index, event)}
                    />
                  </td>
                  <td className="px-6 pr-4 py-2">
                    <button
                      className="text-xs w-full bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 border border-red-700 rounded"
                      onClick={() => handleRemove(index)}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-6 py-4">
            <button
              className="text-xs bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 border border-blue-700 rounded"
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
