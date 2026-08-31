# Contributing

`main` is the integration branch. Open a pull request; do not push directly to `main`.

This repository has **two product tracks**. Keep each PR on **one** track — do not mix `src/connectors/**` changes with connector-cli or other non-connector files.

| Track | Paths |
| ----- | ----- |
| Connectors | `src/connectors/**` |
| connector-cli and other | Everything outside `src/connectors/` |

## Branch names

**Non-connector** work:

```text
<JIRA-KEY|NO-TICKET>-<short-description>
# e.g.: WRS-1234-fix-cli-publish
# or: NO-TICKET-update-agents-md
```

**Connector** work may omit a ticket in the branch name when none exists:

```text
<JIRA-KEY>-<short-description>
# or a descriptive name without a ticket
```

## Commit messages and PR titles

The **first commit message** should align with the **PR title**.

Follow-up commits may use `chore: …` without repeating the ticket or track prefix. Prefer putting `[MAJOR]` / `[MINOR]` / `[Connector]` only on the first commit / PR title.

### Track A — Connectors (`src/connectors/**`)

When adding or modifying a connector:

```text
[Connector][<JIRA-KEY>] <imperative short description>
# or (ticket optional):
[Connector] <imperative short description>
```

Do **not** use `NO-TICKET`, `[MAJOR]`, or `[MINOR]` on connector PRs.

Examples:

```text
[Connector][WRS-XXX] Add Salsify data connector
[Connector][WRS-XXX] Bump Acquia connector auth refresh handling
[Connector] Fix CSV connector empty-row mapping
```

Connector PR rules:

- Change exactly **one** connector per PR.
- Bump that connector’s `package.json` version vs `main`.
- Do not combine with `src/connector-cli/**` or other non-connector files. Root `yarn.lock` is allowed when a connector’s dependencies change.
- A JIRA link in the PR body is optional for connector-only PRs.
- Include required `package.json` metadata: `name`, `description`, `author`, `license`, and `config` (options + mappings). License must be MIT.
- Expose a `yarn build` script; `package.json` `main` must point at the compiled connector output.
- Include a `tests.json` with the connector’s tests; tests should pass before review.

### Track B — connector-cli and other non-connector paths

Applies to `src/connector-cli/**`, root tooling, `.github/`, `scripts/`, docs, and any path **outside** `src/connectors/`.

```text
[[MAJOR|MINOR]][<JIRA-KEY>|NO-TICKET] <imperative short description>
```

| Prefix    | Use when                                |
| --------- | --------------------------------------- |
| `[MAJOR]` | Rare breaking / large structural change |
| `[MINOR]` | Substantial feature work                |
| _(none)_  | Small change or bug fix                 |

For **connector-cli** PRs, `[MAJOR]` / `[MINOR]` also drive the next stable version when the **Promote CLI to NPM** workflow runs (empty `version` input). Default is patch. Optional workflow input `version` (exact `X.Y.Z`) overrides inference.

Examples:

```text
[MAJOR][WRS-XXX] Redesign connector-cli publish pipeline
[MINOR][WRS-XXX] Add OAuth2 JWT bearer auth helper
[WRS-XXX] Fix connector-cli test assertion for empty dirs
[NO-TICKET] Add contributing conventions
```

Do **not** use `[Connector]` on non-connector PRs.

## Pull requests

Reuse [`.github/pull_request_template.md`](.github/pull_request_template.md). Prefer matching the PR title to the first commit message.

**Non-connector PRs:** include a JIRA browse link under Related tickets. For `[NO-TICKET]` work, apply the `No JIRA ticket` label.

**Connector-only PRs:** a Related tickets link is welcome when a ticket exists, but not required.

Do **not** include Cursor attribution in the PR body.

## Checklist

- Keep the PR on one track (connectors **or** non-connector).
- Use Yarn Classic for install and scripts.
- For connectors: one connector only; bump its version; required metadata / `yarn build` / `tests.json` as above.
- For connector-cli: run `yarn build-cli` locally.
- Keep PRs focused.

AI coding agents: see [AGENTS.md](AGENTS.md) for agent-specific workflow rules.
