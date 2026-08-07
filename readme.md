# Connector Framework

Repository represents a monorepo with `connector-cli` and `connectors` exposed via [Connector Hub](https://docs.chiligrafx.com/GraFx-Studio/concepts/connectors/?h=connector+hub#connector-hub)

## Connector-cli

In `src/connector-cli` we created a CLI tool that is able to run a connector in a standalone mode. This isolated runtime simplifies the development lifecycle. It offers a suite of commands to create new projects, build and test code, and deploy your connectors with ease.

See the [readme](src/connector-cli/readme.md) of the package for more info.

## Connectors

In `src/connectors` we collect all connectors that we or our partners implemented

## Development setup

```sh
yarn # to install dependencies
yarn run build-cli # to build local version of the CLI
```

NOTE: Inspect root package.json for more commands to run

Contribution guidelines (branching, PR titles, adding/updating connectors): see [CONTRIBUTING.md](CONTRIBUTING.md). AI coding agents: see [AGENTS.md](AGENTS.md).

### Verified Developers

- Developers can be verified by the repo maintainers. Connectors published by verified developers will be marked as such in the UI. This is to give users confidence that the connector is maintained by a verified developer. This will make sure that an official connector is not published by a random person, and that the connector is maintained by someone who knows what they are doing.

#### Partner framework

- Official Partner
- GraFx SLA (not all CP connectors )
