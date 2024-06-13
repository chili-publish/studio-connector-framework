# Connector Framework

Repository represents a monorepo with `connector-cli` and marketplace `connectors`

## Connector-cli

In `src/connector-cli` we created a CLI tool that is able to run a connector in a standalone mode. This isolated runtime simplifies the development lifecycle. It offers a suite of commands to initialize projects, build and test code, and deploy your connectors with ease.

See the [readme](src/connector-cli/readme.md) of the package for more info.

## Connectors

In `src/connectors` we collect all `marketplace` connectors that we or our partners implemented

## Development setup

```sh
yarn # to install dependencies
yarn run build-cli # to build local version of the CLI
```

NOTE: Inspect root package.json for more commands to run

## Updating / adding a connector:

- Open PR

  - CICD will only pass if the PR contains changes of exactly 1 connector.
  - CICD validates the package.json version is > current released one
  - CICD validates all required metadata is available (see package.json => name, description, author, license, config (options+mappings))
  - CICD validates the license is correct (MIT for now)
  - CICD will build the connector using the `yarn build` command. This means each connector should expose this command. A template package will be hosted in this repo to bootstrap this process for anyone.
  - After building, we expect the main file of the package.json to be the compiled connector code.
  - The PR should also contain a tests.json file, which contains the definition of all tests written for the connector. Oviouly all tests should pass
  - We should run our own suite of tests to verify capabilities / options, etc are all returning without errors.
  - The PR is now ready to be reviewed by repo maintainers

* After merge
  - The connector now availble in the platform UI to choose from when adding a connector to an environment. People can choose a connector, and then pick a version (this info is loaded frm the index json file)

### Verified Developers

- Developers can be verified by the repo maintainers. Connectors published by verified developers will be marked as such in the UI. This is to give users confidence that the connector is maintained by a verified developer. This will make sure that an offical connector is not published by a random person, and that the connector is maintained by someone who knows what they are doing.

#### Partner framework

- Official Partner
- GraFx SLA (not all CP connectors )
