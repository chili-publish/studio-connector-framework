// To parse this data:
//
//   import { Convert, OAuth2AuthorizationCode, OAuth2ClientCredentials, OAuth2JwtBearer, OAuth2ResourceOwnerPassword, StaticKey, ConnectorConfig } from "./file";
//
//   const oAuth2AuthorizationCode = Convert.toOAuth2AuthorizationCode(json);
//   const oAuth2ClientCredentials = Convert.toOAuth2ClientCredentials(json);
//   const oAuth2JwtBearer = Convert.toOAuth2JwtBearer(json);
//   const oAuth2ResourceOwnerPassword = Convert.toOAuth2ResourceOwnerPassword(json);
//   const staticKey = Convert.toStaticKey(json);
//   const connectorConfig = Convert.toConnectorConfig(json);
//
// These functions will throw an error if the JSON doesn't
// match the expected interface, even if the JSON is valid.

export interface OAuth2AuthorizationCode {
    authorizationServerMetadata: OAuth2AuthorizationCodeAuthorizationServerMetadata;
    clientId:                    string;
    clientSecret:                string;
    name?:                       string;
    scope?:                      string;
    specCustomization?:          SpecCustomization;
}

export interface OAuth2AuthorizationCodeAuthorizationServerMetadata {
    authorization_endpoint:                string;
    token_endpoint:                        string;
    token_endpoint_auth_methods_supported: TokenEndpointAuthMethodsSupported[];
}

export enum TokenEndpointAuthMethodsSupported {
    ClientSecretBasic = "client_secret_basic",
    ClientSecretPost = "client_secret_post",
}

export interface SpecCustomization {
    codeParameterName?:  string;
    requestContentType?: RequestContentType;
}

export enum RequestContentType {
    ApplicationJSON = "applicationJson",
    FormURLEncoded = "formUrlEncoded",
}

export interface OAuth2ClientCredentials {
    clientId:      string;
    clientSecret:  string;
    name?:         string;
    scope?:        string;
    tokenEndpoint: string;
}

export interface OAuth2JwtBearer {
    jwtPayload:         { [key: string]: boolean | number | string };
    jwtTokenParamName:  string;
    name?:              string;
    requestBodyParams?: { [key: string]: boolean | number | string };
    signatureConfig:    SignatureConfig;
    tokenEndpoint:      string;
}

export interface SignatureConfig {
    algorithm:  Algorithm;
    privateKey: string;
}

export enum Algorithm {
    Rs256 = "RS256",
}

export interface OAuth2ResourceOwnerPassword {
    authorizationServerMetadata?: OAuth2ResourceOwnerPasswordAuthorizationServerMetadata;
    bodyFormat?:                  RequestContentType;
    clientId:                     string;
    clientSecret:                 string;
    name?:                        string;
    password:                     string;
    scope?:                       string;
    tokenEndpoint:                string;
    username:                     string;
}

export interface OAuth2ResourceOwnerPasswordAuthorizationServerMetadata {
    token_endpoint_auth_methods_supported: TokenEndpointAuthMethodsSupported[];
}

export interface StaticKey {
    key:   string;
    name?: string;
    value: string;
}

export interface ConnectorConfig {
    authenticationConfig?: AuthenticationConfig;
    connectorName?:        string;
    iconUrl?:              string;
    mappings?:             { [key: string]: any };
    options:               { [key: string]: any };
    supportedAuth:         SupportedAuth[];
    type:                  ConnectorType;
}

export interface AuthenticationConfig {
    oAuth2AuthorizationCode?:     OAuth2AuthorizationCodeAuthenticationConfig;
    oAuth2JwtBearer?:             OAuth2JwtBearerAuthenticationConfig;
    oAuth2ResourceOwnerPassword?: OAuth2ResourceOwnerPasswordAuthenticationConfig;
}

export interface OAuth2AuthorizationCodeAuthenticationConfig {
    authorizationServerMetadata: OAuth2AuthorizationCodeAuthorizationServerMetadataClass;
    specCustomization?:          OAuth2AuthorizationCodeSpecCustomization;
}

export interface OAuth2AuthorizationCodeAuthorizationServerMetadataClass {
    token_endpoint_auth_methods_supported: TokenEndpointAuthMethodsSupported[];
}

export interface OAuth2AuthorizationCodeSpecCustomization {
    codeParameterName?:  string;
    requestContentType?: RequestContentType;
}

export interface OAuth2JwtBearerAuthenticationConfig {
    jwtPayload:         OAuth2JwtBearerOption[];
    jwtTokenParamName:  string;
    requestBodyParams?: OAuth2JwtBearerOption[];
    tokenEndpoint?:     string;
}

export interface OAuth2JwtBearerOption {
    key:       string;
    required?: boolean;
    type?:     EditableOptionType;
    ui?:       UI;
    value?:    boolean | number | string;
}

export enum EditableOptionType {
    Secret = "secret",
    Text = "text",
}

export interface UI {
    description: string;
    label:       string;
    placeholder: string;
}

export interface OAuth2ResourceOwnerPasswordAuthenticationConfig {
    authorizationServerMetadata?: OAuth2ResourceOwnerPasswordAuthorizationServerMetadataClass;
    bodyFormat?:                  RequestContentType;
}

export interface OAuth2ResourceOwnerPasswordAuthorizationServerMetadataClass {
    token_endpoint_auth_methods_supported: TokenEndpointAuthMethodsSupported[];
}

export enum SupportedAuth {
    OAuth2AuthorizationCode = "oAuth2AuthorizationCode",
    OAuth2ClientCredentials = "oAuth2ClientCredentials",
    OAuth2JwtBearer = "oAuth2JwtBearer",
    OAuth2ResourceOwnerPassword = "oAuth2ResourceOwnerPassword",
    StaticKey = "staticKey",
}

export enum ConnectorType {
    Data = "data",
    Media = "media",
}

// Converts JSON strings to/from your types
// and asserts the results of JSON.parse at runtime
export class Convert {
    public static toOAuth2AuthorizationCode(json: string): OAuth2AuthorizationCode {
        return cast(JSON.parse(json), r("OAuth2AuthorizationCode"));
    }

    public static oAuth2AuthorizationCodeToJson(value: OAuth2AuthorizationCode): string {
        return JSON.stringify(uncast(value, r("OAuth2AuthorizationCode")), null, 2);
    }

    public static toOAuth2ClientCredentials(json: string): OAuth2ClientCredentials {
        return cast(JSON.parse(json), r("OAuth2ClientCredentials"));
    }

    public static oAuth2ClientCredentialsToJson(value: OAuth2ClientCredentials): string {
        return JSON.stringify(uncast(value, r("OAuth2ClientCredentials")), null, 2);
    }

    public static toOAuth2JwtBearer(json: string): OAuth2JwtBearer {
        return cast(JSON.parse(json), r("OAuth2JwtBearer"));
    }

    public static oAuth2JwtBearerToJson(value: OAuth2JwtBearer): string {
        return JSON.stringify(uncast(value, r("OAuth2JwtBearer")), null, 2);
    }

    public static toOAuth2ResourceOwnerPassword(json: string): OAuth2ResourceOwnerPassword {
        return cast(JSON.parse(json), r("OAuth2ResourceOwnerPassword"));
    }

    public static oAuth2ResourceOwnerPasswordToJson(value: OAuth2ResourceOwnerPassword): string {
        return JSON.stringify(uncast(value, r("OAuth2ResourceOwnerPassword")), null, 2);
    }

    public static toStaticKey(json: string): StaticKey {
        return cast(JSON.parse(json), r("StaticKey"));
    }

    public static staticKeyToJson(value: StaticKey): string {
        return JSON.stringify(uncast(value, r("StaticKey")), null, 2);
    }

    public static toConnectorConfig(json: string): ConnectorConfig {
        return cast(JSON.parse(json), r("ConnectorConfig"));
    }

    public static connectorConfigToJson(value: ConnectorConfig): string {
        return JSON.stringify(uncast(value, r("ConnectorConfig")), null, 2);
    }
}

function invalidValue(typ: any, val: any, key: any, parent: any = ''): never {
    const prettyTyp = prettyTypeName(typ);
    const parentText = parent ? ` on ${parent}` : '';
    const keyText = key ? ` for key "${key}"` : '';
    throw Error(`Invalid value${keyText}${parentText}. Expected ${prettyTyp} but got ${JSON.stringify(val)}`);
}

function prettyTypeName(typ: any): string {
    if (Array.isArray(typ)) {
        if (typ.length === 2 && typ[0] === undefined) {
            return `an optional ${prettyTypeName(typ[1])}`;
        } else {
            return `one of [${typ.map(a => { return prettyTypeName(a); }).join(", ")}]`;
        }
    } else if (typeof typ === "object" && typ.literal !== undefined) {
        return typ.literal;
    } else {
        return typeof typ;
    }
}

function jsonToJSProps(typ: any): any {
    if (typ.jsonToJS === undefined) {
        const map: any = {};
        typ.props.forEach((p: any) => map[p.json] = { key: p.js, typ: p.typ });
        typ.jsonToJS = map;
    }
    return typ.jsonToJS;
}

function jsToJSONProps(typ: any): any {
    if (typ.jsToJSON === undefined) {
        const map: any = {};
        typ.props.forEach((p: any) => map[p.js] = { key: p.json, typ: p.typ });
        typ.jsToJSON = map;
    }
    return typ.jsToJSON;
}

function transform(val: any, typ: any, getProps: any, key: any = '', parent: any = ''): any {
    function transformPrimitive(typ: string, val: any): any {
        if (typeof typ === typeof val) return val;
        return invalidValue(typ, val, key, parent);
    }

    function transformUnion(typs: any[], val: any): any {
        // val must validate against one typ in typs
        const l = typs.length;
        for (let i = 0; i < l; i++) {
            const typ = typs[i];
            try {
                return transform(val, typ, getProps);
            } catch (_) {}
        }
        return invalidValue(typs, val, key, parent);
    }

    function transformEnum(cases: string[], val: any): any {
        if (cases.indexOf(val) !== -1) return val;
        return invalidValue(cases.map(a => { return l(a); }), val, key, parent);
    }

    function transformArray(typ: any, val: any): any {
        // val must be an array with no invalid elements
        if (!Array.isArray(val)) return invalidValue(l("array"), val, key, parent);
        return val.map(el => transform(el, typ, getProps));
    }

    function transformDate(val: any): any {
        if (val === null) {
            return null;
        }
        const d = new Date(val);
        if (isNaN(d.valueOf())) {
            return invalidValue(l("Date"), val, key, parent);
        }
        return d;
    }

    function transformObject(props: { [k: string]: any }, additional: any, val: any): any {
        if (val === null || typeof val !== "object" || Array.isArray(val)) {
            return invalidValue(l(ref || "object"), val, key, parent);
        }
        const result: any = {};
        Object.getOwnPropertyNames(props).forEach(key => {
            const prop = props[key];
            const v = Object.prototype.hasOwnProperty.call(val, key) ? val[key] : undefined;
            result[prop.key] = transform(v, prop.typ, getProps, key, ref);
        });
        Object.getOwnPropertyNames(val).forEach(key => {
            if (!Object.prototype.hasOwnProperty.call(props, key)) {
                result[key] = transform(val[key], additional, getProps, key, ref);
            }
        });
        return result;
    }

    if (typ === "any") return val;
    if (typ === null) {
        if (val === null) return val;
        return invalidValue(typ, val, key, parent);
    }
    if (typ === false) return invalidValue(typ, val, key, parent);
    let ref: any = undefined;
    while (typeof typ === "object" && typ.ref !== undefined) {
        ref = typ.ref;
        typ = typeMap[typ.ref];
    }
    if (Array.isArray(typ)) return transformEnum(typ, val);
    if (typeof typ === "object") {
        return typ.hasOwnProperty("unionMembers") ? transformUnion(typ.unionMembers, val)
            : typ.hasOwnProperty("arrayItems")    ? transformArray(typ.arrayItems, val)
            : typ.hasOwnProperty("props")         ? transformObject(getProps(typ), typ.additional, val)
            : invalidValue(typ, val, key, parent);
    }
    // Numbers can be parsed by Date but shouldn't be.
    if (typ === Date && typeof val !== "number") return transformDate(val);
    return transformPrimitive(typ, val);
}

function cast<T>(val: any, typ: any): T {
    return transform(val, typ, jsonToJSProps);
}

function uncast<T>(val: T, typ: any): any {
    return transform(val, typ, jsToJSONProps);
}

function l(typ: any) {
    return { literal: typ };
}

function a(typ: any) {
    return { arrayItems: typ };
}

function u(...typs: any[]) {
    return { unionMembers: typs };
}

function o(props: any[], additional: any) {
    return { props, additional };
}

function m(additional: any) {
    return { props: [], additional };
}

function r(name: string) {
    return { ref: name };
}

const typeMap: any = {
    "OAuth2AuthorizationCode": o([
        { json: "authorizationServerMetadata", js: "authorizationServerMetadata", typ: r("OAuth2AuthorizationCodeAuthorizationServerMetadata") },
        { json: "clientId", js: "clientId", typ: "" },
        { json: "clientSecret", js: "clientSecret", typ: "" },
        { json: "name", js: "name", typ: u(undefined, "") },
        { json: "scope", js: "scope", typ: u(undefined, "") },
        { json: "specCustomization", js: "specCustomization", typ: u(undefined, r("SpecCustomization")) },
    ], false),
    "OAuth2AuthorizationCodeAuthorizationServerMetadata": o([
        { json: "authorization_endpoint", js: "authorization_endpoint", typ: "" },
        { json: "token_endpoint", js: "token_endpoint", typ: "" },
        { json: "token_endpoint_auth_methods_supported", js: "token_endpoint_auth_methods_supported", typ: a(r("TokenEndpointAuthMethodsSupported")) },
    ], false),
    "SpecCustomization": o([
        { json: "codeParameterName", js: "codeParameterName", typ: u(undefined, "") },
        { json: "requestContentType", js: "requestContentType", typ: u(undefined, r("RequestContentType")) },
    ], false),
    "OAuth2ClientCredentials": o([
        { json: "clientId", js: "clientId", typ: "" },
        { json: "clientSecret", js: "clientSecret", typ: "" },
        { json: "name", js: "name", typ: u(undefined, "") },
        { json: "scope", js: "scope", typ: u(undefined, "") },
        { json: "tokenEndpoint", js: "tokenEndpoint", typ: "" },
    ], false),
    "OAuth2JwtBearer": o([
        { json: "jwtPayload", js: "jwtPayload", typ: m(u(true, 3.14, "")) },
        { json: "jwtTokenParamName", js: "jwtTokenParamName", typ: "" },
        { json: "name", js: "name", typ: u(undefined, "") },
        { json: "requestBodyParams", js: "requestBodyParams", typ: u(undefined, m(u(true, 3.14, ""))) },
        { json: "signatureConfig", js: "signatureConfig", typ: r("SignatureConfig") },
        { json: "tokenEndpoint", js: "tokenEndpoint", typ: "" },
    ], false),
    "SignatureConfig": o([
        { json: "algorithm", js: "algorithm", typ: r("Algorithm") },
        { json: "privateKey", js: "privateKey", typ: "" },
    ], false),
    "OAuth2ResourceOwnerPassword": o([
        { json: "authorizationServerMetadata", js: "authorizationServerMetadata", typ: u(undefined, r("OAuth2ResourceOwnerPasswordAuthorizationServerMetadata")) },
        { json: "bodyFormat", js: "bodyFormat", typ: u(undefined, r("RequestContentType")) },
        { json: "clientId", js: "clientId", typ: "" },
        { json: "clientSecret", js: "clientSecret", typ: "" },
        { json: "name", js: "name", typ: u(undefined, "") },
        { json: "password", js: "password", typ: "" },
        { json: "scope", js: "scope", typ: u(undefined, "") },
        { json: "tokenEndpoint", js: "tokenEndpoint", typ: "" },
        { json: "username", js: "username", typ: "" },
    ], false),
    "OAuth2ResourceOwnerPasswordAuthorizationServerMetadata": o([
        { json: "token_endpoint_auth_methods_supported", js: "token_endpoint_auth_methods_supported", typ: a(r("TokenEndpointAuthMethodsSupported")) },
    ], false),
    "StaticKey": o([
        { json: "key", js: "key", typ: "" },
        { json: "name", js: "name", typ: u(undefined, "") },
        { json: "value", js: "value", typ: "" },
    ], false),
    "ConnectorConfig": o([
        { json: "authenticationConfig", js: "authenticationConfig", typ: u(undefined, r("AuthenticationConfig")) },
        { json: "connectorName", js: "connectorName", typ: u(undefined, "") },
        { json: "iconUrl", js: "iconUrl", typ: u(undefined, "") },
        { json: "mappings", js: "mappings", typ: u(undefined, m("any")) },
        { json: "options", js: "options", typ: m("any") },
        { json: "supportedAuth", js: "supportedAuth", typ: a(r("SupportedAuth")) },
        { json: "type", js: "type", typ: r("ConnectorType") },
    ], false),
    "AuthenticationConfig": o([
        { json: "oAuth2AuthorizationCode", js: "oAuth2AuthorizationCode", typ: u(undefined, r("OAuth2AuthorizationCodeAuthenticationConfig")) },
        { json: "oAuth2JwtBearer", js: "oAuth2JwtBearer", typ: u(undefined, r("OAuth2JwtBearerAuthenticationConfig")) },
        { json: "oAuth2ResourceOwnerPassword", js: "oAuth2ResourceOwnerPassword", typ: u(undefined, r("OAuth2ResourceOwnerPasswordAuthenticationConfig")) },
    ], false),
    "OAuth2AuthorizationCodeAuthenticationConfig": o([
        { json: "authorizationServerMetadata", js: "authorizationServerMetadata", typ: r("OAuth2AuthorizationCodeAuthorizationServerMetadataClass") },
        { json: "specCustomization", js: "specCustomization", typ: u(undefined, r("OAuth2AuthorizationCodeSpecCustomization")) },
    ], false),
    "OAuth2AuthorizationCodeAuthorizationServerMetadataClass": o([
        { json: "token_endpoint_auth_methods_supported", js: "token_endpoint_auth_methods_supported", typ: a(r("TokenEndpointAuthMethodsSupported")) },
    ], false),
    "OAuth2AuthorizationCodeSpecCustomization": o([
        { json: "codeParameterName", js: "codeParameterName", typ: u(undefined, "") },
        { json: "requestContentType", js: "requestContentType", typ: u(undefined, r("RequestContentType")) },
    ], false),
    "OAuth2JwtBearerAuthenticationConfig": o([
        { json: "jwtPayload", js: "jwtPayload", typ: a(r("OAuth2JwtBearerOption")) },
        { json: "jwtTokenParamName", js: "jwtTokenParamName", typ: "" },
        { json: "requestBodyParams", js: "requestBodyParams", typ: u(undefined, a(r("OAuth2JwtBearerOption"))) },
        { json: "tokenEndpoint", js: "tokenEndpoint", typ: u(undefined, "") },
    ], false),
    "OAuth2JwtBearerOption": o([
        { json: "key", js: "key", typ: "" },
        { json: "required", js: "required", typ: u(undefined, true) },
        { json: "type", js: "type", typ: u(undefined, r("EditableOptionType")) },
        { json: "ui", js: "ui", typ: u(undefined, r("UI")) },
        { json: "value", js: "value", typ: u(undefined, u(true, 3.14, "")) },
    ], false),
    "UI": o([
        { json: "description", js: "description", typ: "" },
        { json: "label", js: "label", typ: "" },
        { json: "placeholder", js: "placeholder", typ: "" },
    ], false),
    "OAuth2ResourceOwnerPasswordAuthenticationConfig": o([
        { json: "authorizationServerMetadata", js: "authorizationServerMetadata", typ: u(undefined, r("OAuth2ResourceOwnerPasswordAuthorizationServerMetadataClass")) },
        { json: "bodyFormat", js: "bodyFormat", typ: u(undefined, r("RequestContentType")) },
    ], false),
    "OAuth2ResourceOwnerPasswordAuthorizationServerMetadataClass": o([
        { json: "token_endpoint_auth_methods_supported", js: "token_endpoint_auth_methods_supported", typ: a(r("TokenEndpointAuthMethodsSupported")) },
    ], false),
    "TokenEndpointAuthMethodsSupported": [
        "client_secret_basic",
        "client_secret_post",
    ],
    "RequestContentType": [
        "applicationJson",
        "formUrlEncoded",
    ],
    "Algorithm": [
        "RS256",
    ],
    "EditableOptionType": [
        "secret",
        "text",
    ],
    "SupportedAuth": [
        "oAuth2AuthorizationCode",
        "oAuth2ClientCredentials",
        "oAuth2JwtBearer",
        "oAuth2ResourceOwnerPassword",
        "staticKey",
    ],
    "ConnectorType": [
        "data",
        "media",
    ],
};
