# Connector Contrib

This repository is a placeholder for the soon-to-be connector repository.

The idea is that we will host opensourced connectors in this repo and provide
all tools and cicd to automate as much as possible in the process of publishing a new connector.

## root package.json
Inspect the root package.json to see how to build / setup 

## connector-cli
In `src/connector-cli` we created a cli tool that is able to run a connector in standalone mode. This isolated runtime gives us the opportunity to run tests, while mocking network requests, etc.

See the readme in the connector-cli folder for more info.
 
### Updating / adding a connector:

* Open PR
  * CICD will only pass if the PR contains changes of exactly 1 connector.
  * CICD validates the package.json version is > current released one
  * CICD validates all required metadata is available (see package.json => name, description, author, license, config (options+mappings))
  * CICD validates the license is correct (MIT for now)
  * CICD will build the connector using the `yarn build` command. This means each connector should expose this command. A template package will be hosted in this repo to bootstrap this process for anyone.
  * After building, we expect the main file of the package.json to be the compiled connector code.
  * The PR should also contain a tests.json file, which contains the definition of all tests written for the connector. Oviouly all tests should pass
  * We should run our own suite of tests to verify capabilities / options, etc are all returning without errors.
  * The PR is now ready to be reviewed by repo maintainers

* Merge PR
  * When merging the PR to main branch, the scripts/publish.js file will be executed. This file will combine all metadata + code in a json file <connectorName>.<connectorVersion>.json in the root /publish folder. 
  * All files in the ./publish folder are copied to Azure Storage, where they are hosted in a CDN friendly folder. We update an index file 'index.json' which contains a list of all connectors, and their versions.

* After merge
  * The connector now availble in the platform UI to choose from when adding a connector to an environment. People can choose a connector, and then pick a version (this info is loaded frm the index json file)

### Verified Developers

* Developers can be verified by the repo maintainers. Connectors published by verified developers will be marked as such in the UI. This is to give users confidence that the connector is maintained by a verified developer. This will make sure that an offical connector is not published by a random person, and that the connector is maintained by someone who knows what they are doing.

#### Partner framework

* Official Partner
* GraFx SLA (not all CP connectors )