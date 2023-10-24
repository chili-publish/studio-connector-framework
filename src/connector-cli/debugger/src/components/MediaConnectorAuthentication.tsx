import React, { useState } from 'react';
import { Button, Input, Form, List } from 'antd';
import { useData } from '../state/Context';

const MediaConnectorAuthentication: React.FC = () => {
  const [httpHeader, setHttpHeader] = useState('');
  const [httpValue, setHttpValue] = useState('');
  const { state, dispatch } = useData();

  const handleSubmit = () => {
    dispatch({ type: 'ADD_HEADER', payload: { HttpHeader: httpHeader, HttpValue: httpValue } });
    setHttpHeader('');
    setHttpValue('');
  };

  const handleRemove = (index: number) => {
    const newHeaders = [...state.headers];
    newHeaders.splice(index, 1);
    dispatch({ type: 'SET_HEADERS', payload: newHeaders });
  };

  return (
    <>
      <Form onFinish={handleSubmit}>
        <Form.Item label="HTTP Header">
          <Input value={httpHeader} onChange={e => setHttpHeader(e.target.value)} />
        </Form.Item>
        <Form.Item label="HTTP Value">
          <Input value={httpValue} onChange={e => setHttpValue(e.target.value)} />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit">
            Add Header
          </Button>
        </Form.Item>
      </Form>
      <List
        itemLayout="horizontal"
        dataSource={state.headers}
        renderItem={(item, index) => (
          <List.Item
            actions={[
              <Button danger onClick={() => handleRemove(index)}>
                Remove
              </Button>,
            ]}
          >
            <List.Item.Meta title={item.HttpHeader} description={item.HttpValue} />
          </List.Item>
        )}
      />
    </>
  );
};

export default MediaConnectorAuthentication;
