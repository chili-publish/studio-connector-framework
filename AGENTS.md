# AGENTS.md — Studio Connector Framework

This file documents workflows and guidelines for **AI coding agents** working in this repository.
Human contribution rules (branching, commits, PR titles, checklist) live in [CONTRIBUTING.md](CONTRIBUTING.md).

---

- [AGENTS.md — Studio Connector Framework](#agentsmd--studio-connector-framework)
  - [General](#general)
  - [Working with AI Agents](#working-with-ai-agents)
    - [Branch before commit (never commit on `main`)](#branch-before-commit-never-commit-on-main)
    - [Creating pull requests](#creating-pull-requests)
  - [Project Structure](#project-structure)
  - [Package Manager](#package-manager)
  - [Workflows](#workflows)
    - [Install and build connector-cli](#install-and-build-connector-cli)
    - [Work on a connector](#work-on-a-connector)

---

## General

This repository is a Yarn workspaces monorepo with **two product tracks**:

| Track | Path | Role |
| ----- | ---- | ---- |
| connector-cli | `src/connector-cli/` | `@chili-publish/connector-cli` — standalone CLI to create, build, test, and publish connectors |
| Connectors | `src/connectors/*` | Connector Hub packages (one package per connector) |

Also present: `src/connector-cli/debugger/` (CLI debugger UI), `scripts/` (Hub publish helpers).

`main` is the long-lived integration branch. Changes go through pull requests. Contribution formats and dual-track PR rules: [CONTRIBUTING.md](CONTRIBUTING.md).

---

## Working with AI Agents

Before edits, commits, or pull requests, follow [CONTRIBUTING.md](CONTRIBUTING.md) for ticket references, branch names, commit / PR titles, and PR description rules. Do not invent formats. Do not proceed until the ticket rules for the relevant track are satisfied.

When creating a PR, keep the title and description concise.

### Branch before commit (never commit on `main`)

`main` is protected integration history. **AI agents MUST NOT commit, amend, or push directly on `main`.**

Required order before the first commit of a change:

1. Confirm ticket / track rules per [CONTRIBUTING.md](CONTRIBUTING.md).
2. If not already on a correctly named feature branch, create and check it out from up-to-date `main` using the naming in [CONTRIBUTING.md](CONTRIBUTING.md).
3. Make changes and commit **only on that branch**.
4. Open a pull request into `main` (do not merge locally into `main`).

If work was accidentally committed on `main`, move it onto a correctly named branch and reset local `main` to `origin/main` before continuing. Never push those commits to `origin/main`.

### Creating pull requests

**Reuse the repo PR template** ([`.github/pull_request_template.md`](.github/pull_request_template.md)). Do not invent a custom body. For title, Related tickets, labels, and checklist, follow [CONTRIBUTING.md](CONTRIBUTING.md).

Do not hand-write connector-cli tarball or Connector Hub URLs in the PR body — CI comments them when applicable. Do **not** include Cursor attribution in the PR body.

---

## Project Structure

```text
src/
  connector-cli/       # @chili-publish/connector-cli (+ debugger/)
  connectors/          # One package per Connector Hub connector
scripts/               # Marketplace / Hub publish helpers
.github/               # Actions workflows, PR template, CODEOWNERS
```

---

## Package Manager

Use **Yarn Classic (v1)** — not npm, not pnpm, not Yarn Berry for workspace installs.

| Requirement | Value |
| ----------- | ----- |
| Yarn        | `1.22.x` (lockfile is Yarn v1) |
| Node        | CLI requires `>=20`; CI uses `22.x` |

```bash
yarn install
```

Do not mix package managers. Prefer `yarn <script>` over `npm run <script>` for workspace scripts.

---

## Workflows

### Install and build connector-cli

```bash
yarn
yarn build-cli
```

Useful root scripts: `yarn refresh-cli`, `yarn build-connectors`, `yarn publish-all` (see root `package.json`).

Do **not** manually bump `src/connector-cli/package.json` for the normal merge-to-main prerelease flow — CI owns that. For a stable public npm release, set the final version in `package.json`, merge, then create a GitHub Release tag matching `v<version>`.

### Work on a connector

Build and verify the connector package locally (`yarn build` in `src/connectors/<name>/`, or as documented in its readme). For one-connector-per-PR, version bump, and title rules, follow [CONTRIBUTING.md](CONTRIBUTING.md).
