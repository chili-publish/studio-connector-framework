#!/usr/bin/env node
/*
  Why this exists
  ---------------
  publish-cli.yml and promote-cli.yml bump src/connector-cli/package.json on
  main, then commit. Root package.json resolutions pins
  @chili-publish/connector-cli to that exact workspace version so connectors
  use the local CLI (Yarn Classic file: resolutions skip the package's
  devDependencies and break `yarn build-cli`). yarn.lock may also record that
  version under connector-cli stanzas when other workspaces depend on a
  version range. Yarn Classic often omits the workspace package from the
  lockfile entirely; missing stanzas are then expected. CI uses yarn install
  --frozen-lockfile, so a bump without syncing resolutions (and lock stanzas
  when present) fails the next install.

  Running a full `yarn install` on the runner to refresh the lock is unsafe:
  Yarn Classic can rewrite machine-specific file: keys and unrelated lock
  entries (the original publish-cli lock churn). This script only updates:
    1) package.json resolutions["@chili-publish/connector-cli"]
    2) yarn.lock version lines for @chili-publish/connector-cli stanzas, if any
*/
const fs = require('fs');
const path = require('path');

// SemVer core + optional prerelease/build (rejects forms like 1.2.3.rc).
const SEMVER_RE =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;

const version = process.argv[2];
if (!version || !SEMVER_RE.test(version)) {
  console.error('Usage: node scripts/sync-connector-cli-lock-version.js <semver>');
  process.exit(1);
}

const root = path.join(__dirname, '..');
const packageJsonPath = path.join(root, 'package.json');
const lockPath = path.join(root, 'yarn.lock');

const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
if (!pkg.resolutions || typeof pkg.resolutions !== 'object') {
  pkg.resolutions = {};
}
const previousResolution = pkg.resolutions['@chili-publish/connector-cli'];
pkg.resolutions['@chili-publish/connector-cli'] = version;

const lock = fs.readFileSync(lockPath, 'utf8');

// Stanza whose key line is for @chili-publish/connector-cli (caret or exact).
const pattern =
  /^("[^"]*@chili-publish\/connector-cli@[^"]+"(?:, "[^"]+")*:)\r?\n((?:  .*\r?\n)*?)(  version )"[^"]*"/gm;

let replacements = 0;
const updatedLock = lock.replace(pattern, (match, keyLine, middle, versionPrefix) => {
  replacements += 1;
  return `${keyLine}\n${middle}${versionPrefix}"${version}"`;
});

const lockMentionsPackage = /@chili-publish\/connector-cli@/.test(lock);
if (replacements === 0 && lockMentionsPackage) {
  console.error(
    'Found @chili-publish/connector-cli in yarn.lock but could not parse stanzas; refusing to continue',
  );
  process.exit(1);
}

fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2) + '\n');
console.log(
  previousResolution === version
    ? `package.json resolutions already at connector-cli ${version}`
    : `Updated package.json resolutions @chili-publish/connector-cli: ${previousResolution} → ${version}`,
);

if (replacements === 0) {
  console.log(
    'No @chili-publish/connector-cli stanzas in yarn.lock (workspace package omitted); skipped lockfile rewrite',
  );
} else if (updatedLock === lock) {
  console.log(
    `yarn.lock already at connector-cli ${version} (${replacements} entr${replacements === 1 ? 'y' : 'ies'})`,
  );
} else {
  fs.writeFileSync(lockPath, updatedLock);
  console.log(
    `Updated ${replacements} yarn.lock entr${replacements === 1 ? 'y' : 'ies'} to connector-cli ${version}`,
  );
}
