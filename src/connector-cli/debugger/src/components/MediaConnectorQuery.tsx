import React, { useState } from 'react';
import { Button, Input, Form, List, Typography, Divider, Space } from 'antd';
import { useQueryOptions } from '../state/QueryContext';
import { useData } from '../state/Context';
import { initRuntime } from '../helpers/runtime';
import JsonObjectRenderer from './JsonObjectRenderer';

const MediaConnectorQuery: React.FC = () => {
  const { state, dispatch } = useQueryOptions();
  const { state: globalHeaders } = useData();

  const [pageToken, setPageToken] = useState(
    state?.queryOptions?.pageToken ?? ''
  );
  const [filter, setFilter] = useState(state?.queryOptions?.filter ?? '');
  const [collection, setCollection] = useState(
    state?.queryOptions?.collection ?? ''
  );
  const [pageSize, setPageSize] = useState(state?.queryOptions?.pageSize ?? 10);
  const [metadataKey, setMetadataKey] = useState('');
  const [metadataValue, setMetadataValue] = useState('');
  const [resultSet, setResults] = useState<any[]>([]);

  const handleQueryOptionsSubmit = () => {
    dispatch({
      type: 'SET_QUERY_OPTIONS',
      payload: { pageToken, filter, collection, pageSize },
    });
  };

  const handleMetadataSubmit = () => {
    dispatch({
      type: 'ADD_METADATA',
      payload: { key: metadataKey, value: metadataValue },
    });
    setMetadataKey('');
    setMetadataValue('');
  };

  const handleRemove = (index: number) => {
    dispatch({ type: 'REMOVE_METADATA', payload: index });
  };

  async function executeConnectorQuery(): Promise<void> {
    const connector = await initRuntime(globalHeaders.headers);
    const results = await connector.query(state.queryOptions, state.metadata);

    console.log('connector', connector);
    console.log('results', results);
    setResults(results.data);
  }

  return (
    <>
      <Form
        onFinish={handleQueryOptionsSubmit}
        labelCol={{ span: 8 }}
        wrapperCol={{ span: 16 }}
        style={{ maxWidth: 600 }}
        initialValues={{ remember: true }}
      >
        {/* Add form fields for token, filter, collection, and pageSize here */}
        <Form.Item label="Next Page Token">
          <Input
            value={pageToken}
            onChange={(e) => setPageToken(e.target.value)}
          />
        </Form.Item>
        <Form.Item label="Filter">
          <Input value={filter} onChange={(e) => setFilter(e.target.value)} />
        </Form.Item>
        <Form.Item label="Collection">
          <Input
            value={collection}
            onChange={(e) => setCollection(e.target.value)}
          />
        </Form.Item>
        <Form.Item label="Page Size">
          <Input
            value={pageSize}
            onChange={(e) => setPageSize(parseInt(e.target.value))}
          />
        </Form.Item>
        <Form.Item>
          <Button type="default" htmlType="submit">
            Set Query Options
          </Button>
        </Form.Item>
      </Form>
      <Divider />
      <Form
        onFinish={handleMetadataSubmit}
        labelCol={{ span: 8 }}
        wrapperCol={{ span: 16 }}
        style={{ maxWidth: 600 }}
        initialValues={{ remember: true }}
      >
        <Form.Item label="Metadata Key">
          <Input
            value={metadataKey}
            onChange={(e) => setMetadataKey(e.target.value)}
          />
        </Form.Item>
        <Form.Item label="Metadata Value">
          <Input
            value={metadataValue}
            onChange={(e) => setMetadataValue(e.target.value)}
          />
        </Form.Item>
        <Form.Item wrapperCol={{ offset: 0, span: 16 }}>
          <Button type="default" htmlType="submit">
            Add Metadata
          </Button>
        </Form.Item>
      </Form>
      <List
        itemLayout="horizontal"
        bordered
        dataSource={state.metadata}
        renderItem={(item, index) => (
          <List.Item
            actions={[
              <Button danger onClick={() => handleRemove(index)}>
                Remove
              </Button>,
            ]}
          >
            <Typography.Text mark>{item.key}</Typography.Text> :{' '}
            <Typography.Text strong> {item.value}</Typography.Text>
          </List.Item>
        )}
      />

      <Divider />
      <Button type="primary" block onClick={executeConnectorQuery}>
        Execute
      </Button>

      <JsonObjectRenderer data={resultSet} />
    </>
  );
};

export default MediaConnectorQuery;
