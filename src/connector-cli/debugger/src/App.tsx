import React, { useState } from 'react';
import type { MenuProps } from 'antd';
import { Layout, Menu, theme } from 'antd';
import { DataProvider } from './state/Context';
import AuthForm from './components/Auth';
import { QueryOptionsProvider } from './state/QueryContext';
import QueryOptionsForm from './components/QueryMethod';
import DownloadForm from './components/DownloadMethod';
import DetailOptionsForm from './components/DetailMethod';

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

  const components = {
    AuthForm,
    QueryOptionsForm,
    DetailOptionsForm,
    DownloadForm,
  };

  const items: MenuProps['items'] = Object.keys(components).map((key, index) => ({
    key: String(index + 1),
    label: `${key}`,
    onClick: () => handleMenuClick(key),
  }));

  //@ts-ignore
  const SelectedComponent = selectedComponent ? components[selectedComponent] : null;

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
            {/* <Header style={{ padding: 0, background: colorBgContainer }} /> */}
            <Content style={{ margin: '24px 16px 0', overflow: 'initial' }}>
              <div style={{ padding: 24, textAlign: 'center', background: colorBgContainer }}>
                {SelectedComponent ? <SelectedComponent /> : 'Please select a component'}
              </div>
            </Content>
            {/* <Footer style={{ textAlign: 'center' }}>CHILI publish ©2023 Studio Connector Debugger</Footer> */}
          </Layout>
        </Layout>
      </DataProvider>
    </QueryOptionsProvider>
  );
};

export default App;