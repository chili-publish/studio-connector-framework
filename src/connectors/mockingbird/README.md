<div align="center">
  <img src="Mockingbird.svg" alt="Mockingbird" width="96" />
</div>

# Mockingbird

A connector that sings back any media you ask for, but never leaves the cage. Unless you open it.

## Modes

**Offline mode (default)**: each asset returns a pre-encoded 1×1 colored PNG — no network required. Frames are sized correctly using the realistic per-asset dimensions from `detail()`.

**Remote mode**: fetches a deterministic photo from [picsum.photos](https://picsum.photos) using the asset ID as a seed — the same asset always returns the same image. Requires network access.

## Configuration options

The only option is **useRemoteImages** (runtime option, text): set to `"true"` to enable remote mode. Any other value (including empty) uses offline mode.

## Local development

Prerequisites: [Docker Desktop](https://www.docker.com/products/docker-desktop/)

### First-time setup

Build the image once (this installs all dependencies inside the image):

```bash
docker-compose build
```

### Start a shell in the container

```bash
docker-compose run -p 3300:3300 cli sh
```

This drops you into a shell with `connector-cli` available and the connector source mounted at `/connector`. Dependencies are provided by the image — no local `npm install` needed.

### Build

```bash
connector-cli build
```

### Manual testing

```bash
connector-cli debug -p 3300 -w
```

Open the debug UI at http://localhost:3300/?type=MediaConnector. Browse the catalog to see the 100 assets. To test remote mode, set the `useRemoteImages` runtime option to `"true"` — the connector will fetch from picsum.photos using the asset ID as a seed instead of returning the local pixel placeholder.

### Publish to a GraFx environment

```bash
# Authenticate once (token is stored in a named Docker volume)
connector-cli login

# Deploy
connector-cli publish -b https://<your-environment>.chili-publish.online/grafx -e <environment-name> -n Mockingbird --proxyOption.allowedDomains "picsum.photos" -ro "useRemoteImages"="true"
```

The `connector-auth` Docker volume persists the login token between sessions so you only need to run `login` once.
