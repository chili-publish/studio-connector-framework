export type DataModel = {
  name: string;
  parameters: Parameter[];
};

export type InvokableDataModel = DataModel & {
  returnsImage: boolean;
  returnJson: boolean;
  returnJsonArray: boolean;
  invoke: (values: any[]) => Promise<any>;
};

export type SettableDataModel = DataModel & {
  set: (values: any[]) => void;
};

export type ConnectorMetadata = {
  name: string;
  type: 'MediaConnector' | 'FontConnector' | 'DataConnector';
  getDisplayType: () => string;
};

export type SimpleParameter = {
  value?: any;
  name: string;
  componentType: 'text' | 'boolean' | 'list';
};

export type SelectParameter = {
  value?: any;
  name: string;
  componentType: 'select';
  options?: string[];
};

export type NumberParameter = {
  value?: number;
  name: string;
  componentType: 'number';
  min?: number;
  max?: number;
};

export type DictionaryParameter = {
  value?: any;
  name: string;
  componentType: 'dictionary';
  rectrictModification?: boolean;
};

export type Parameter =
  | SimpleParameter
  | ComplexParameter
  | SelectParameter
  | DictionaryParameter
  | NumberParameter;

export type ComplexParameter = {
  value?: any;
  name: string;
  componentType: 'complex';
  complex: Array<SimpleParameter | DictionaryParameter | NumberParameter>;
};
