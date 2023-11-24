export type DataModel = {
    name: string;
    parameters: Parameter[];
    returnsImage: boolean;
    returnJson: boolean;
    returnJsonArray: boolean;
    isAsync: boolean;
    isInvokable: boolean;
    invoke: (values: any[]) => Promise<any>;
};

export type ConnectorMetadata = {
    name: string;
    type: "media" | "font" | "data";
    getDisplayType: () => string;   
};

export type SimpleParameter = {
    value?: any | undefined;
    name: string;
    componentType: 'text' | 'boolean' | 'dictionary';
};

export type ListParameter = {
    componentType: 'list';
    list: string[] | undefined;
    value?: any | undefined;
    name: string;
};

export type Parameter = SimpleParameter | ComplexParameter | ListParameter;

export type ComplexParameter = {
    value?: any | undefined;
    name: string;
    componentType: 'text' | 'boolean' | 'complex';
    complex: SimpleParameter[] | undefined;
}