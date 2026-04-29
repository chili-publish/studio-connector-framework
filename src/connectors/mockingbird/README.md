# Mockingbird

A connector that sings back any media you ask for, but never leaves the cage. Unless you open the cage.

## Modes

**Offline mode (default)**: each asset returns a pre-encoded 1×1 colored PNG — no network required. Frames are sized correctly using the realistic per-asset dimensions from `detail()`.

**Remote mode**: fetches a random photo from [picsum.photos](https://picsum.photos) at the appropriate resolution. Requires network access.

## Configuration options

- **Use remote images** (text): set to `"true"` to fetch downloads from `picsum.photos` instead of returning the local pixel placeholder. Any other value (including empty) uses offline mode.

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

Open the debug UI at http://localhost:3300/?type=MediaConnector. Browse the catalog to see the 10 assets. To test remote mode, set the `Use remote images` option to `"true"` — the connector will fetch from picsum.photos instead of returning the local pixel placeholder.

### Publish to a GraFx environment

```bash
# Authenticate once (token is stored in a named Docker volume)
connector-cli login

# Deploy
connector-cli publish -b https://<your-environment>.chili-publish.online/grafx -e <environment-name> -n Mockingbird --proxyOption.allowedDomains "picsum.photos"
```

The `connector-auth` Docker volume persists the login token between sessions so you only need to run `login` once.
