# Connector CLI

`@chili-publish/connector-cli` is a command-line interface tool designed to facilitate the management of connector test and publish processes in the CHILI publisher ecosystem. It provides a suite of commands to create new projects, build connectors, debug, test, and deploy them to your environment.

## Features

### Project setup

- **New**: Scaffold a new connector project with `new`.

### Development

- **Build**: Build your connector from TypeScript to JavaScript with `build`.
- **Debug**: Run a local debug server for your connector with `debug`.
- **Test**: Run a test suite against your connector with `test`.
- **Stress Test**: Perform stress tests on your compiled connector with `stress`.

### Deployment

- **Publish**: Deploy your connector to the specified environment with `publish`.
- **Set Auth**: Configure your connector authentication with `set-auth`.
- **Delete**: Remove a published connector from an environment with `delete`.

### Informational

- **Info**: Retrieve information about your connector with `info`.
- **Demo**: Run a demo of your connector with `demo`.

## Installation

### Prerequisites

- Node.js 20 LTS or higher
- [Yarn v1.22.19](https://classic.yarnpkg.com/lang/en/docs/install/) or higher (for building from source)

You can install `@chili-publish/connector-cli` globally via npm:

```sh
npm install -g @chili-publish/connector-cli
```

Or, if you prefer using Yarn:

```sh
yarn global add @chili-publish/connector-cli
```

## Usage

After installation, the `connector-cli` command will be available globally. Below are some examples of how to use the CLI:

> **Note:** For commands that accept `pathToProject`, if omitted, it defaults to the current directory (`./`).

### Create a new connector project

For a media connector:

```sh
connector-cli new YourProjectName -t media -n YourConnectorName
```

For a data connector:

```sh
connector-cli new YourProjectName -t data -n YourConnectorName
```

### Build a connector

```sh
connector-cli build
```

With watch mode:

```sh
connector-cli build -w
```

### Login to the system

```sh
connector-cli login
```

### Deploy a connector to environment

```sh
connector-cli publish -b EnvironmentAPIBaseURL -e YOUR_ENVIRONMENT -n YourConnectorName --proxyOption.allowedDomains "example.com" "*.example.com"
```

To update an existing connector:

```sh
connector-cli publish -b EnvironmentAPIBaseURL -e YOUR_ENVIRONMENT -n YourConnectorName --connectorId EXISTING_CONNECTOR_ID --proxyOption.allowedDomains "example.com"
```

### Configure a connector authentication

```sh
connector-cli set-auth -b EnvironmentAPIBaseURL -e YOUR_ENVIRONMENT --connectorId ConnectorIdFromEnv -au browser -at staticKey --auth-data-file ./pathToAuthData
```

Available authentication types: `staticKey`, `oAuth2ClientCredentials`, `oAuth2ResourceOwnerPassword`, `oAuth2AuthorizationCode`, `oAuth2JwtBearer`

Available usage types: `browser`, `server`

### Debug a connector

```sh
connector-cli debug -p 3300 -w
```

### Get connector information

```sh
connector-cli info -o info.json
```

### Test a connector

```sh
connector-cli test -t ./test/your-test-file.ts
```

### Run a demo of a connector

```sh
connector-cli demo
```

### Stress test a connector

```sh
connector-cli stress -i 100
```

### Delete a connector from environment

```sh
connector-cli delete -b EnvironmentAPIBaseURL -e YOUR_ENVIRONMENT --connectorId ConnectorIdFromEnv
```

## Build Instructions

To build `@chili-publish/connector-cli` from source, follow these steps:

> yarn -v # to check existing yarn version

1. Clone the repository:

   ```sh
   git clone https://github.com/chili-publish/studio-connector-framework.git
   cd studio-connector-framework
   ```

2. Install dependencies:

   ```sh
   yarn install
   ```

3. Run the build script from the root:

   ```sh
   yarn run build-cli
   ```

   Or from the connector-cli directory:

   ```sh
   cd src/connector-cli
   yarn run build
   ```

This will compile TypeScript files to JavaScript and prepare the CLI for use.

## Auto generated types

The package includes types located in `src/core/gen-types.ts` file that automaticaly produced by [quicktype](https://github.com/glideapps/quicktype) library. You shouldn't manually change this typescript file. If you want to make a change you need to update a corresponding `json-schema` file under `resources/schemas/...` directory and execute `yarn workspace @chili-publish/connector-cli run produce-types` from the root level of monorepo

## Contributing

Contributions are welcome! Please feel free to submit a pull request or create an issue if you have any ideas, suggestions, or bug reports.
