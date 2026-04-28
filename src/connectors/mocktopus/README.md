# Mocktopus

A many-tentacled connector that pretends to connect to everything but actually connects to nothing.

Mocktopus generates fake data from a declarative schema DSL — useful for testing Studio templates without a real data source.

## Schema DSL

Define a schema using a comma-separated list of fields with their types and optional parameters. Each field is specified as `fieldName:type` or `fieldName:type(param1=value1,param2=value2)`.

Example:
```
firstName:shortText, age:number(min=0,max=100), active:boolean, joinDate:date
```

### Available field types and parameters:

- **shortText**: Generates short mock text (1-2 words)
  - `numberOfWords`: Number of words to generate (default: 2)
  - Example: `title:shortText(numberOfWords=3)`

- **longText**: Generates longer mock text (multiple sentences and paragraphs)
  - `numberOfParagraphs`: Number of paragraphs to generate (default: 2)
  - Example: `description:longText(numberOfParagraphs=3)`

- **number**: Generates numbers within a range
  - `min`: Minimum value (default: 0)
  - `max`: Maximum value (default: 1000)
  - Example: `age:number(min=18,max=100)` or `score:number(min=0,max=100)`

- **boolean**: Generates random true/false values
  - No parameters
  - Example: `active:boolean`

- **date**: Generates random dates between 2020-01-01 and 2030-01-01
  - No parameters
  - Example: `joinDate:date`

- **group**: Generates an array of mock words
  - `entries`: Number of entries in the group (default: 3)
  - Example: `tags:group(entries=5)`

## Local development

Prerequisites: [Docker Desktop](https://www.docker.com/products/docker-desktop/)

### First-time setup

Build the image once (this installs all dependencies inside the image):

```bash
docker-compose build
```

### Start a shell in the container

```bash
docker-compose run cli sh
```

This drops you into a shell with `connector-cli` available and the connector source mounted at `/connector`. Dependencies are provided by the image — no local `npm install` needed.

### Build

```bash
connector-cli build
```

### Run tests

```bash
connector-cli test -t tests.json
```

### Publish to a GraFx environment

```bash
# Authenticate once (token is stored in a named Docker volume)
connector-cli login

# Deploy
connector-cli publish \
  -b https://<your-environment>.chili-publish.online/grafx \
  -e <environment-name> \
  -n Mocktopus
```

The `connector-auth` Docker volume persists the login token between sessions so you only need to run `login` once.
