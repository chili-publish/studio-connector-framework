#!/usr/bin/env node
/*
  Why this exists
  ---------------
  publish-cli.yml and promote-cli.yml bump src/connector-cli/package.json on
  main, then commit. yarn.lock still records the previous version under the
  @chili-publish/connector-cli@file:src/connector-cli entry (from root
  resolutions). CI uses yarn install --frozen-lockfile, so that mismatch would
  fail the next install.

  Running a full `yarn install` on the runner to refresh the lock is unsafe:
  Yarn Classic can rewrite machine-specific file: keys and unrelated lock
  entries (the original publish-cli lock churn). This script only updates the
  connector-cli workspace version line(s) so the bump commit stays scoped to
  package.json + that minimal yarn.lock change.
*/
const fs = require('fs');
const path = require('path');

const version = process.argv[2];
if (!version || !/^\d+\.\d+\.\d+([.-][\w.-]+)?$/.test(version)) {
  console.error('Usage: node scripts/sync-connector-cli-lock-version.js <semver>');
  process.exit(1);
}

const lockPath = path.join(__dirname, '..', 'yarn.lock');
const lock = fs.readFileSync(lockPath, 'utf8');

// Stanza whose key line includes @chili-publish/connector-cli@file:… (alone or merged).
const pattern =
  /^([^\n]*@chili-publish\/connector-cli@file:[^\n]+)\n((?:  .*\n)*?)(  version )"[^"]*"/gm;

let replacements = 0;
const updated = lock.replace(pattern, (match, keyLine, middle, versionPrefix) => {
  replacements += 1;
  return `${keyLine}\n${middle}${versionPrefix}"${version}"`;
});

if (replacements === 0) {
  console.error(
    'No @chili-publish/connector-cli@file: entries found in yarn.lock; refusing to continue',
  );
  process.exit(1);
}

if (updated === lock) {
  console.log(
    `yarn.lock already at connector-cli ${version} (${replacements} entr${replacements === 1 ? 'y' : 'ies'})`,
  );
  process.exit(0);
}

fs.writeFileSync(lockPath, updated);
console.log(
  `Updated ${replacements} yarn.lock entr${replacements === 1 ? 'y' : 'ies'} to connector-cli ${version}`,
);
