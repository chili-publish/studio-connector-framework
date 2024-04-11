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
  value?: any | undefined;
  name: string;
  componentType: 'text' | 'boolean' | 'list';
};

export type SelectParameter = {
  value?: any | undefined;
  name: string;
  componentType: 'select';
  options: string[] | undefined;
};

export type NumberParameter = {
  value?: number | undefined;
  name: string;
  componentType: 'number';
  min?: number;
  max?: number;
};

export type DictionaryParameter = {
  value?: any | undefined;
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
  value?: any | undefined;
  name: string;
  componentType: 'text' | 'boolean' | 'complex';
  complex:
    | Array<SimpleParameter | DictionaryParameter | NumberParameter>
    | undefined;
};
