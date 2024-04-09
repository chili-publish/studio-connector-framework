import React from 'react';

interface Props {
  data: Record<string, any>[];
}

const PrettyPrintJson: React.FC<any> = ({ data }) => {
  // (destructured) data could be a prop for example
  return (
    <div className="flex-1 overflow-y-auto">
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
};

const JsonObjectRenderer: React.FC<Props> = ({ data }) => {
  if (!data || data.length === 0) {
    return null;
  }

  return <PrettyPrintJson data={data} />;
};

export default JsonObjectRenderer;
