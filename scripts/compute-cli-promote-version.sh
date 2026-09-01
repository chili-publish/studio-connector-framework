#!/usr/bin/env bash
# Compute the next stable connector-cli version and CLI-only release notes.
#
# Inputs (env):
#   VERSION_OVERRIDE — optional exact stable semver (e.g. 1.13.0)
#   GITHUB_REPOSITORY — owner/repo (set by Actions)
#   GH_TOKEN — optional; used to resolve PR titles via the GitHub API
#   GITHUB_OUTPUT — optional; when set, writes version / previous_tag / notes_file
#
# Outputs:
#   Prints version, previous_tag, notes_file as KEY=value
#   Writes release notes markdown to a temp file
set -euo pipefail

CLI_PATH="src/connector-cli"
STABLE_TAG_RE='^v[0-9]+\.[0-9]+\.[0-9]+$'
VERSION_OVERRIDE="${VERSION_OVERRIDE:-}"

find_previous_stable_tag() {
  local tag
  while read -r tag; do
    if [[ "$tag" =~ $STABLE_TAG_RE ]]; then
      echo "$tag"
      return 0
    fi
  done < <(git tag -l 'v*' --sort=-v:refname)
  return 1
}

bump_semver() {
  local base="$1" # X.Y.Z without v
  local kind="$2"
  local major minor patch
  IFS=. read -r major minor patch <<<"$base"
  case "$kind" in
    major) echo "$((major + 1)).0.0" ;;
    minor) echo "${major}.$((minor + 1)).0" ;;
    patch) echo "${major}.${minor}.$((patch + 1))" ;;
    *)
      echo "Unknown bump kind: $kind" >&2
      exit 1
      ;;
  esac
}

validate_stable_semver() {
  local v="$1"
  if [[ ! "$v" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo "Invalid stable version '$v'. Expected X.Y.Z (no prerelease)." >&2
    exit 1
  fi
}

# Returns 0 when $1 is strictly greater than $2 (both X.Y.Z without v).
version_gt() {
  local left="$1"
  local right="$2"
  [[ "$(printf '%s\n%s\n' "$left" "$right" | sort -V | tail -n1)" == "$left" && "$left" != "$right" ]]
}

tag_exists() {
  local tag="$1"
  [ -n "$(git tag -l "$tag")" ]
}

extract_pr_number() {
  local subject="$1"
  if [[ "$subject" =~ \(#([0-9]+)\)$ ]]; then
    echo "${BASH_REMATCH[1]}"
  elif [[ "$subject" =~ [Mm]erge\ pull\ request\ #([0-9]+) ]]; then
    echo "${BASH_REMATCH[1]}"
  fi
}

resolve_pr_title() {
  local pr="$1"
  local fallback="$2"
  local title=""

  if [ -z "${GITHUB_REPOSITORY:-}" ] || ! command -v gh >/dev/null 2>&1; then
    echo "$fallback"
    return
  fi

  if title="$(gh api "repos/${GITHUB_REPOSITORY}/pulls/${pr}" --jq .title 2>/dev/null)" && [ -n "$title" ]; then
    echo "$title"
    return
  fi

  echo "$fallback"
}

# Squash / merge subjects that touched connector-cli, resolved to PR titles when possible.
collect_cli_pr_subjects() {
  local previous_tag="$1"
  local range_args=()
  local raw subject pr fallback title

  if [ -n "$previous_tag" ]; then
    range_args=("${previous_tag}..HEAD")
  fi

  # Squash merges / CI commits that only bump or promote versions are noise for notes.
  raw="$(
    git log "${range_args[@]}" --pretty=format:'%s' -- "$CLI_PATH" \
      | grep -v '^CI: bumps version' \
      | grep -v '^CI: promote connector-cli' \
      | grep -vi 'connector cli release' \
      || true
  )"

  while IFS= read -r subject; do
    [ -z "$subject" ] && continue
    pr="$(extract_pr_number "$subject")"
    if [ -n "$pr" ]; then
      if [[ "$subject" =~ \(#${pr}\)$ ]]; then
        fallback="${subject% (#${pr})}"
      else
        fallback="$subject"
      fi
      title="$(resolve_pr_title "$pr" "$fallback")"
      echo "${title} (#${pr})"
    else
      echo "$subject"
    fi
  done <<<"$raw"
}

infer_bump_from_subjects() {
  local subjects="$1"
  if echo "$subjects" | grep -q '\[MAJOR\]'; then
    echo "major"
  elif echo "$subjects" | grep -q '\[MINOR\]'; then
    echo "minor"
  else
    echo "patch"
  fi
}

write_release_notes() {
  local subjects="$1"
  local notes_file="$2"
  local repo="${GITHUB_REPOSITORY:-chili-publish/studio-connector-framework}"

  {
    echo "## What's Changed"
    echo
    if [ -z "$(echo "$subjects" | sed '/^$/d')" ]; then
      echo "* No connector-cli package changes since the previous stable release."
    else
      while IFS= read -r subject; do
        [ -z "$subject" ] && continue
        if [[ "$subject" =~ \(#([0-9]+)\)$ ]]; then
          local pr="${BASH_REMATCH[1]}"
          local title="${subject% (#${pr})}"
          echo "* ${title} ([#${pr}](https://github.com/${repo}/pull/${pr}))"
        else
          echo "* ${subject}"
        fi
      done <<<"$subjects"
    fi
    echo
  } >"$notes_file"
}

PREVIOUS_TAG=""
if PREVIOUS_TAG="$(find_previous_stable_tag)"; then
  echo "Previous stable tag: ${PREVIOUS_TAG}" >&2
else
  PREVIOUS_TAG=""
  echo "No previous stable tag found." >&2
fi

SUBJECTS="$(collect_cli_pr_subjects "$PREVIOUS_TAG")"
echo "CLI-related PR titles / subjects since ${PREVIOUS_TAG:-beginning}:" >&2
echo "$SUBJECTS" >&2

if [ -n "$VERSION_OVERRIDE" ]; then
  validate_stable_semver "$VERSION_OVERRIDE"

  if [ -n "$PREVIOUS_TAG" ] && ! version_gt "$VERSION_OVERRIDE" "${PREVIOUS_TAG#v}"; then
    echo "Version override '${VERSION_OVERRIDE}' must be greater than previous stable tag '${PREVIOUS_TAG}'." >&2
    exit 1
  fi

  if tag_exists "v${VERSION_OVERRIDE}"; then
    echo "Tag v${VERSION_OVERRIDE} already exists. Choose a newer version." >&2
    exit 1
  fi

  NEXT_VERSION="$VERSION_OVERRIDE"
  echo "Using version override: ${NEXT_VERSION}" >&2
else
  if [ -z "$PREVIOUS_TAG" ]; then
    echo "Cannot infer version: no previous stable tag. Pass version input." >&2
    exit 1
  fi
  BASE_VERSION="${PREVIOUS_TAG#v}"
  BUMP="$(infer_bump_from_subjects "$SUBJECTS")"
  NEXT_VERSION="$(bump_semver "$BASE_VERSION" "$BUMP")"
  echo "Inferred bump=${BUMP} -> ${NEXT_VERSION}" >&2
fi

NOTES_DIR="${RUNNER_TEMP:-/tmp}"
NOTES_FILE="$(mktemp "${NOTES_DIR}/cli-release-notes.XXXXXX")"
write_release_notes "$SUBJECTS" "$NOTES_FILE"

if [ -n "${GITHUB_OUTPUT:-}" ]; then
  {
    echo "version=${NEXT_VERSION}"
    echo "previous_tag=${PREVIOUS_TAG}"
    echo "notes_file=${NOTES_FILE}"
    echo "tag=v${NEXT_VERSION}"
  } >>"$GITHUB_OUTPUT"
fi

echo "version=${NEXT_VERSION}"
echo "previous_tag=${PREVIOUS_TAG}"
echo "notes_file=${NOTES_FILE}"
echo "tag=v${NEXT_VERSION}"
