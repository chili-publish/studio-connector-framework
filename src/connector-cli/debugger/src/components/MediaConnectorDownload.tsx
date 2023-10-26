import React, {useState} from 'react';
import {Button, Input, Form, List, Typography, Divider} from 'antd';
import {useData} from '../state/Context';
import {getImageFromCache, initRuntime} from '../helpers/runtime';
import {
  DownloadIntent,
  DownloadType,
  useDownloadOptions,
} from '../state/DownloadContext';
import ArrayBufferImage from './ImageFromBuffer';

const MediaConnectorDownload: React.FC = () => {
  const {state, dispatch} = useDownloadOptions();
  const {state: globalHeaders} = useData();

  const [id, setId] = useState(state?.id ?? '');
  const [downloadType, setDownloadType] = useState(state?.downloadType ?? '');
  const [downloadIntent, setDownloadIntent] = useState(
    state?.downloadIntent ?? '',
  );
  const [metadataKey, setMetadataKey] = useState('');
  const [metadataValue, setMetadataValue] = useState('');
  const [resultSet, setResults] = useState<ArrayBuffer | null>(null);

  const handleDownloadOptionsSubmit = () => {
    dispatch({type: 'SET_ID', payload: id});
    dispatch({type: 'SET_DOWNLOAD_TYPE', payload: downloadType});
    dispatch({type: 'SET_DOWNLOAD_INTENT', payload: downloadIntent});
  };

  const handleMetadataSubmit = () => {
    dispatch({
      type: 'ADD_METADATA',
      payload: {key: metadataKey, value: metadataValue},
    });
    setMetadataKey('');
    setMetadataValue('');
  };

  const handleRemove = (index: number) => {
    dispatch({type: 'REMOVE_METADATA', payload: index});
  };

  async function executeConnectorDownload(): Promise<void> {
    var connector = await initRuntime(globalHeaders.headers);
    const results = await connector.download(
      state.id,
      state.downloadType,
      state.downloadIntent,
      state.metadata,
    );

    console.log('connector', connector);
    console.log('results', results);
    setResults(await getImageFromCache(results.id));
  }

  return (
    <>
      <Form
        onFinish={handleDownloadOptionsSubmit}
        labelCol={{span: 8}}
        wrapperCol={{span: 16}}
        style={{maxWidth: 600}}
        initialValues={{remember: true}}
      >
        {/* Add form fields for token, filter, collection, and pageSize here */}
        <Form.Item label="Id">
          <Input value={id} onChange={e => setId(e.target.value)} />
        </Form.Item>
        <Form.Item label="DownloadType">
          <Input
            value={downloadType}
            onChange={e => setDownloadType(e.target.value as DownloadType)}
          />
        </Form.Item>
        <Form.Item label="DownloadIntent">
          <Input
            value={downloadIntent}
            onChange={e => setDownloadIntent(e.target.value as DownloadIntent)}
          />
        </Form.Item>
        <Form.Item>
          <Button type="default" htmlType="submit">
            Set Download Options
          </Button>
        </Form.Item>
      </Form>
      <Divider />
      <Form
        onFinish={handleMetadataSubmit}
        labelCol={{span: 8}}
        wrapperCol={{span: 16}}
        style={{maxWidth: 600}}
        initialValues={{remember: true}}
      >
        <Form.Item label="Metadata Key">
          <Input
            value={metadataKey}
            onChange={e => setMetadataKey(e.target.value)}
          />
        </Form.Item>
        <Form.Item label="Metadata Value">
          <Input
            value={metadataValue}
            onChange={e => setMetadataValue(e.target.value)}
          />
        </Form.Item>
        <Form.Item wrapperCol={{offset: 0, span: 16}}>
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
      <Button type="primary" block onClick={executeConnectorDownload}>
        Execute
      </Button>

      {resultSet == null && <Typography.Text strong>Failed</Typography.Text>}
      {resultSet != null && (
        <ArrayBufferImage width={200} buffer={resultSet} height={200} />
      )}
    </>
  );
};

export default MediaConnectorDownload;
