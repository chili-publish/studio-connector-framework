import React from 'react';
import { Popover, Table } from 'antd';

interface Props {
  data: Record<string, any>[];
}

const JsonObjectRenderer: React.FC<Props> = ({ data }) => {
  if (!data || data.length === 0) {
    return null;
  }

  // Extract column names from the first object in the array
  const columns = Object.keys(data[0]).map((key) => ({
    title: key,
    dataIndex: key,
    key: key,
    render: (text: any) => {
      let cellText = '';
      // Check if the text is an object or array
      if (typeof text === 'object' && text !== null) {
        // Stringify the value if it's an object or array
        cellText = JSON.stringify(text, null, 2);
      } else {
        cellText = text;
      }

      return (
        <Popover
          placement="top"
          title="Full value"
          content={cellText}
          trigger="hover"
          destroyTooltipOnHide={true}
          fresh={true}
        >
          {cellText}
        </Popover>
      );
    },
  }));

  return (
    <Table
      rootClassName="json-object-renderer"
      columns={columns}
      dataSource={data}
      pagination={false}
    />
  );
};

export default JsonObjectRenderer;
