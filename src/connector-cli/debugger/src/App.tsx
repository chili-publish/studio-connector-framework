import React, { useState } from 'react';
import type { MenuProps } from 'antd';
import { Layout, Menu, theme } from 'antd';
import { DataProvider } from './state/Context';
import { QueryOptionsProvider } from './state/QueryContext';
import MediaConnectorAuthentication from './components/MediaConnectorAuthentication';
import MediaConnectorDetail from './components/MediaConnectorDetail';
import MediaConnectorDownload from './components/MediaConnectorDownload';
import MediaConnectorQuery from './components/MediaConnectorQuery';

const { Content, Sider } = Layout;

const App: React.FC = () => {
  const {
    token: { colorBgContainer },
  } = theme.useToken();

  const [selectedComponent, setSelectedComponent] = useState<String | null>(null);

  const handleMenuClick = (item: any) => {
    console.log('item', item);
    setSelectedComponent(item);
  };

  const components = [
    { component: MediaConnectorAuthentication, name: 'Authentication'},
    { component: MediaConnectorQuery, name: 'Query'},
    { component: MediaConnectorDetail, name: 'Detail'},
    { component: MediaConnectorDownload, name: 'Download'},
  ];

  const items: MenuProps['items'] = components.map((key, index) => ({
    key: String(index + 1),
    label: `${key.name}`,
    onClick: () => handleMenuClick(key.name),
  }));

  const SelectedComponent = selectedComponent ? components.find((key, index) => {
    if (key.name === selectedComponent) {
      return true;
    }
  })?.component : null;

  return (
    <QueryOptionsProvider>
      <DataProvider>
        <Layout hasSider>
          <Sider
            style={{
              overflow: 'auto',
              height: '100vh',
              position: 'fixed',
              left: 0,
              top: 0,
              bottom: 0,
            }}
          >
            <div className="demo-logo-vertical" />
            <Menu theme="dark" mode="inline" defaultSelectedKeys={[]} items={items} />
          </Sider>
          <Layout className="site-layout" style={{ marginLeft: 200 }}>
            <Content style={{ margin: '24px 16px 0', overflow: 'initial' }}>
              <div style={{ padding: 24, textAlign: 'center', background: colorBgContainer }}>
                {SelectedComponent ? <SelectedComponent /> : 'Please select a component'}
              </div>
            </Content>
          </Layout>
        </Layout>
      </DataProvider>
    </QueryOptionsProvider>
  );
};

export default App;