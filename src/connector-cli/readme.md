# @chili-publish/connector-cli

`@chili-publish/connector-cli` is a command-line interface tool designed to facilitate the management of connector test and publish processes in the CHILI publisher ecosystem. It provides a suite of commands to initialize projects, build connectors, debug, test, deploy them to your environment.

## Features

### Project setup

- **Init**: Scaffold a new connector project with `init`.
- **New**: Scaffold a new connector project with `new`.

### Development

- **Build**: Build your connector from TypeScript to JavaScript with `build`.
- **Debug**: Run a local debug server for your connector with `debug`.
- **Test**: Run a test suite against your connector with `test`.
- **Stress Test**: Perform stress tests on your compiled connector with `stress`.

### Deployment

- **Publish**: Deploy your connector to the specified environment with `publish`.
- **Set Auth**: Configure your connector authentication with `set-auth`.

### Informational

- **Info**: Retrieve information about your connector with `info`.

## Installation

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

### Initialize a new connector

```sh
connector-cli init --name YourConnectorName
```

or

```sh
connector-cli new --name YourConnectorName
```

### Build a connector

```sh
connector-cli build --outFolder ./dist
```

### Login to the system

```sh
connector-cli login
```

### Deploy a connector to environment

```sh
connector-cli publish pathToProject --baseUrl EnvironmentAPIBaseURL --environment YOUR_ENVIRONMENT --name YourConnectorName
```

### Configure a connector authentication

```sh
connector-cli set-auth pathToProject --baseUrl EnvironmentAPIBaseURL --environment YOUR_ENVIRONMENT --connectorId ConnectorIdFromEnv --usage browser --type staticKey --auth-data-file ./pathToAuthData
```

### Debug a connector

```sh
connector-cli debug --port 8080 --watch
```

### Get connector information

```sh
connector-cli info --out info.json
```

### Test a connector

```sh
connector-cli test --testFile ./test/your-test-file.ts
```

### Stress test a connector

```sh
connector-cli stress --iterations 100
```

## Build Instructions

To build `@chili-publish/connector-cli` from source, follow these steps:

### Prerequisites

Ensure that you have [Yarn v1.22.19](https://classic.yarnpkg.com/lang/en/docs/install/) is installed

> yarn -v # to check existing yarn version

1. Clone the repository:

   ```sh
   git clone https://github.com/chili-publish/studio-connector-framework.git
   cd connector-cli
   ```

2. Install dependencies:

   ```sh
   yarn install
   ```

3. Run the build script:

   ```sh
   yarn run build-cli
   ```

This will compile TypeScript files to JavaScript and prepare the CLI for use.

## Auto generated types

The package includes types located in `src/core/gen-types.ts` file that automaticaly produced by [quicktype](https://github.com/glideapps/quicktype) library. You shouldn't manually change this typescript file. If you want to make a change you need to update a corresponding `json-schema` file under `resources/schemas/...` directory and execute `yarn workspace @chili-publish/connector-cli run produce-types` from the root level of monorepo

## Contributing

Contributions are welcome! Please feel free to submit a pull request or create an issue if you have any ideas, suggestions, or bug reports.
