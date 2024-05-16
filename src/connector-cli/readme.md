# @chili-publish/connector-cli

`@chili-publish/connector-cli` is a command-line interface tool designed to facilitate the management of connector test and publish processes in the CHILI publisher ecosystem. It provides a suite of commands to initialize projects, build connectors, debug, test, and publish them to the marketplace.

## Features

- **Initialize**: Scaffold a new connector with `init`.
- **Publish**: Publish your connector to the marketplace with `publish`.
- **Build**: Build your connector from TypeScript to JavaScript with `build`.
- **Debug**: Run a local debug server for your connector with `debug`.
- **Info**: Retrieve information about your connector with `info`.
- **Test**: Run a test suite against your connector with `test`.
- **Stress Test**: Perform stress tests on your compiled connector with `stress`.

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

### Build a connector

```sh
connector-cli build --outFolder ./dist
```

### Publish a connector

```sh
connector-cli publish pathToTsFile --baseUrl EnvironmentAPIBaseURL --environment YOUR_ENVIRONMENT --name YourConnectorName
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

1. Clone the repository:

   ```sh
   git clone https://github.com/chili-publish/studio-connector-contrib.git
   cd connector-cli
   ```

2. Install dependencies:

   ```sh
   npm install
   ```

   Or if you are using Yarn:

   ```sh
   yarn install
   ```

3. Run the build script:

   ```sh
   npm run build
   ```

   Or with Yarn:

   ```sh
   yarn build
   ```

This will compile TypeScript files to JavaScript and prepare the CLI for use.

## Contributing

Contributions are welcome! Please feel free to submit a pull request or create an issue if you have any ideas, suggestions, or bug reports.
