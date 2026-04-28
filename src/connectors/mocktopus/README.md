# Mocktopus

A many-tentacled connector that pretends to connect to everything but actually connects to nothing.

Mocktopus generates fake data from a declarative schema DSL — useful for testing Studio templates without a real data source.

## Schema DSL

Configure the connector with a `schema` option such as:

```
firstName:shortText, age:number(min=0,max=100), active:boolean, joinDate:date
```

Supported field types: `shortText`, `longText`, `number`, `boolean`, `date`, `group`

## Local development

Prerequisites: [Docker Desktop](https://www.docker.com/products/docker-desktop/)

### First-time setup

Build the image once (this installs all dependencies inside the image):

```bash
docker-compose build
```

### Start a shell in the container

```bash
docker-compose run cli
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
