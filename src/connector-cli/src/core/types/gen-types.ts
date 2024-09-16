// To parse this data:
//
//   import { Convert, ChiliToken, Oauth2AuthorizationCode, Oauth2ClientCredentials, Oauth2ResourceOwnerPassword, StaticKey, ConnectorConfig } from "./file";
//
//   const chiliToken = Convert.toChiliToken(json);
//   const oauth2AuthorizationCode = Convert.toOauth2AuthorizationCode(json);
//   const oauth2ClientCredentials = Convert.toOauth2ClientCredentials(json);
//   const oauth2ResourceOwnerPassword = Convert.toOauth2ResourceOwnerPassword(json);
//   const staticKey = Convert.toStaticKey(json);
//   const connectorConfig = Convert.toConnectorConfig(json);
//
// These functions will throw an error if the JSON doesn't
// match the expected interface, even if the JSON is valid.

export interface ChiliToken {
    name: string;
}

export interface Oauth2AuthorizationCode {
    authorizationServerMetadata: AuthorizationServerMetadata;
    clientId:                    string;
    clientSecret:                string;
    name:                        string;
    scope?:                      string;
    specCustomization?:          SpecCustomization;
}

export interface AuthorizationServerMetadata {
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

export interface Oauth2ClientCredentials {
    clientId:      string;
    clientSecret:  string;
    name:          string;
    scope?:        string;
    tokenEndpoint: string;
}

export interface Oauth2ResourceOwnerPassword {
    bodyFormat?:   RequestContentType;
    clientId:      string;
    clientSecret:  string;
    name:          string;
    password:      string;
    scope?:        string;
    tokenEndpoint: string;
    username:      string;
}

export interface StaticKey {
    key:   string;
    name:  string;
    value: string;
}

export interface ConnectorConfig {
    iconUrl?:      string;
    displayName:   string;
    mappings?:     { [key: string]: any };
    options:       { [key: string]: any };
    supportedAuth: SupportedAuth[];
    type:          Type;
}

export enum SupportedAuth {
    Chili = "chili",
    OAuth2AuthorizationCode = "oAuth2AuthorizationCode",
    OAuth2ClientCredentials = "oAuth2ClientCredentials",
    OAuth2ResourceOwnerPassword = "oAuth2ResourceOwnerPassword",
    StaticKey = "staticKey",
}

export enum Type {
    Media = "media",
}

// Converts JSON strings to/from your types
// and asserts the results of JSON.parse at runtime
export class Convert {
    public static toChiliToken(json: string): ChiliToken {
        return cast(JSON.parse(json), r("ChiliToken"));
    }

    public static chiliTokenToJson(value: ChiliToken): string {
        return JSON.stringify(uncast(value, r("ChiliToken")), null, 2);
    }

    public static toOauth2AuthorizationCode(json: string): Oauth2AuthorizationCode {
        return cast(JSON.parse(json), r("Oauth2AuthorizationCode"));
    }

    public static oauth2AuthorizationCodeToJson(value: Oauth2AuthorizationCode): string {
        return JSON.stringify(uncast(value, r("Oauth2AuthorizationCode")), null, 2);
    }

    public static toOauth2ClientCredentials(json: string): Oauth2ClientCredentials {
        return cast(JSON.parse(json), r("Oauth2ClientCredentials"));
    }

    public static oauth2ClientCredentialsToJson(value: Oauth2ClientCredentials): string {
        return JSON.stringify(uncast(value, r("Oauth2ClientCredentials")), null, 2);
    }

    public static toOauth2ResourceOwnerPassword(json: string): Oauth2ResourceOwnerPassword {
        return cast(JSON.parse(json), r("Oauth2ResourceOwnerPassword"));
    }

    public static oauth2ResourceOwnerPasswordToJson(value: Oauth2ResourceOwnerPassword): string {
        return JSON.stringify(uncast(value, r("Oauth2ResourceOwnerPassword")), null, 2);
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
    "ChiliToken": o([
        { json: "name", js: "name", typ: "" },
    ], false),
    "Oauth2AuthorizationCode": o([
        { json: "authorizationServerMetadata", js: "authorizationServerMetadata", typ: r("AuthorizationServerMetadata") },
        { json: "clientId", js: "clientId", typ: "" },
        { json: "clientSecret", js: "clientSecret", typ: "" },
        { json: "name", js: "name", typ: "" },
        { json: "scope", js: "scope", typ: u(undefined, "") },
        { json: "specCustomization", js: "specCustomization", typ: u(undefined, r("SpecCustomization")) },
    ], false),
    "AuthorizationServerMetadata": o([
        { json: "authorization_endpoint", js: "authorization_endpoint", typ: "" },
        { json: "token_endpoint", js: "token_endpoint", typ: "" },
        { json: "token_endpoint_auth_methods_supported", js: "token_endpoint_auth_methods_supported", typ: a(r("TokenEndpointAuthMethodsSupported")) },
    ], false),
    "SpecCustomization": o([
        { json: "codeParameterName", js: "codeParameterName", typ: u(undefined, "") },
        { json: "requestContentType", js: "requestContentType", typ: u(undefined, r("RequestContentType")) },
    ], false),
    "Oauth2ClientCredentials": o([
        { json: "clientId", js: "clientId", typ: "" },
        { json: "clientSecret", js: "clientSecret", typ: "" },
        { json: "name", js: "name", typ: "" },
        { json: "scope", js: "scope", typ: u(undefined, "") },
        { json: "tokenEndpoint", js: "tokenEndpoint", typ: "" },
    ], false),
    "Oauth2ResourceOwnerPassword": o([
        { json: "bodyFormat", js: "bodyFormat", typ: u(undefined, r("RequestContentType")) },
        { json: "clientId", js: "clientId", typ: "" },
        { json: "clientSecret", js: "clientSecret", typ: "" },
        { json: "name", js: "name", typ: "" },
        { json: "password", js: "password", typ: "" },
        { json: "scope", js: "scope", typ: u(undefined, "") },
        { json: "tokenEndpoint", js: "tokenEndpoint", typ: "" },
        { json: "username", js: "username", typ: "" },
    ], false),
    "StaticKey": o([
        { json: "key", js: "key", typ: "" },
        { json: "name", js: "name", typ: "" },
        { json: "value", js: "value", typ: "" },
    ], false),
    "ConnectorConfig": o([
        { json: "iconUrl", js: "iconUrl", typ: u(undefined, "") },
        { json: "mappings", js: "mappings", typ: u(undefined, m("any")) },
        { json: "options", js: "options", typ: m("any") },
        { json: "supportedAuth", js: "supportedAuth", typ: a(r("SupportedAuth")) },
        { json: "type", js: "type", typ: r("Type") },
    ], false),
    "TokenEndpointAuthMethodsSupported": [
        "client_secret_basic",
        "client_secret_post",
    ],
    "RequestContentType": [
        "applicationJson",
        "formUrlEncoded",
    ],
    "SupportedAuth": [
        "chili",
        "oAuth2AuthorizationCode",
        "oAuth2ClientCredentials",
        "oAuth2ResourceOwnerPassword",
        "staticKey",
    ],
    "Type": [
        "media",
    ],
};
