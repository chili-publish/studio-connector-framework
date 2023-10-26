import React, { useState } from 'react';
import { Button, Input, Form, List, Typography, Divider } from 'antd';
import { useDetailOptions } from '../state/DetailContext';
import { useData } from '../state/Context';
import { initRuntime } from '../helpers/runtime';
import JsonObjectRenderer from './JsonObjectRenderer';

const MediaConnectorDetail: React.FC = () => {
  const { state, dispatch } = useDetailOptions();
  const { state: globalHeaders } = useData();

  const [id, setId] = useState(state?.detailOptions?.id ?? '');
  const [metadataKey, setMetadataKey] = useState('');
  const [metadataValue, setMetadataValue] = useState('');
  const [resultSet, setResults] = useState<any>({});

  const handleDetailOptionsSubmit = () => {
    dispatch({ type: 'SET_DETAIL_OPTIONS', payload: { id } });
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

  async function executeConnectorDetail(): Promise<void> {
    var connector = await initRuntime(globalHeaders.headers);
    const results = await connector.detail(
      state.detailOptions.id,
      state.metadata
    );

    console.log('connector', connector);
    console.log('results', results);
    setResults(results);
  }

  return (
    <>
      <Form
        onFinish={handleDetailOptionsSubmit}
        labelCol={{ span: 8 }}
        wrapperCol={{ span: 16 }}
        style={{ maxWidth: 600 }}
        initialValues={{ remember: true }}
      >
        {/* Add form fields for token, filter, collection, and pageSize here */}
        <Form.Item label="Id">
          <Input value={id} onChange={(e) => setId(e.target.value)} />
        </Form.Item>
        <Form.Item>
          <Button type="default" htmlType="submit">
            Set Detail Options
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

      <Button type="primary" block onClick={executeConnectorDetail}>
        Execute
      </Button>

      <JsonObjectRenderer data={[resultSet]} />
    </>
  );
};

export default MediaConnectorDetail;
