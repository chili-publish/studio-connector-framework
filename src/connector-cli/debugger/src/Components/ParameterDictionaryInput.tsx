import React, { useState } from 'react';
import { DictionaryParameter, Parameter } from '../Helpers/DataModel';

export const ParameterDictionaryInput = ({
  parameter,
  onChange,
}: {
  parentParameter: Parameter | undefined;
  parameter: DictionaryParameter;
  onChange: (name: string, parameter: Parameter, value: any) => void;
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
    setItems(items.filter((item, i) => i !== index));
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
    onChange(parameter.name, parameter, newItemsObject);
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
    onChange(parameter.name, parameter, newItemsObject);
  };

  return (
    <>
      <div className="overflow-hidden ">
        <div className="relative overflow-x-auto border">
          <table className="table-fixed w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
              <tr>
                <th scope="col" className="px-4 py-2">
                  Key
                </th>
                <th scope="col" className="px-4 py-2">
                  Value
                </th>
                {parameter.rectrictModification ? null : (
                  <th scope="col" className="px-4 py-2"></th>
                )}
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr
                  className="bg-white border-b dark:bg-gray-800 dark:border-gray-700"
                  key={index}
                >
                  <td
                    scope="row"
                    className="px-4 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white"
                  >
                    <input
                      className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                      type="text"
                      value={item.key}
                      placeholder="Enter key"
                      onChange={(event) => handleKeyChange(index, event)}
                    />
                  </td>
                  <td className="px-2 pr-4">
                    <input
                      className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 "
                      type="text"
                      value={item.value}
                      placeholder="Enter value"
                      onChange={(event) => handleValueChange(index, event)}
                    />
                  </td>
                  {parameter.rectrictModification ? null : (
                    <td className="pl-2 pr-4 py-2">
                      <button
                        className="text-xs w-full bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 border border-red-700 rounded"
                        onClick={() => handleRemove(index)}
                      >
                        Remove
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {parameter.rectrictModification ? null : (
            <div className="px-6 py-4">
              <button
                className="text-xs bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 border border-blue-700 rounded"
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
