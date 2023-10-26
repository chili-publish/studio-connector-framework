import React from 'react';
import {Table} from 'antd';

interface Props {
  data: Record<string, any>[];
}

const JsonObjectRenderer: React.FC<Props> = ({data}) => {
  if (!data || data.length === 0) {
    return null;
  }

  // Extract column names from the first object in the array
  const columns = Object.keys(data[0]).map(key => ({
    title: key,
    dataIndex: key,
    key: key,
    render: (text: any) => {
      // Check if the text is an object or array
      if (typeof text === 'object' && text !== null) {
        // Stringify the value if it's an object or array
        return JSON.stringify(text, null, 2);
      }

      // Otherwise, return the value as is
      return text;
    },
  }));

  return <Table columns={columns} dataSource={data} />;
};

export default JsonObjectRenderer;
