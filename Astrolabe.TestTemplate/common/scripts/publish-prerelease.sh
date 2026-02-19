#!/bin/bash
# Publishes pre-release packages to local Verdaccio registry.
# Rush appends custom parameters: [--tag TAG]

TAG="dev"

while [[ $# -gt 0 ]]; do
  case $1 in
    --tag)
      TAG="$2"
      shift 2
      ;;
    *)
      shift
      ;;
  esac
done

# Check for uncommitted package.json changes (:(top) matches from repo root)
if ! git diff --quiet -- ':(top)**/package.json' 2>/dev/null || \
   ! git diff --cached --quiet -- ':(top)**/package.json' 2>/dev/null; then
  echo "ERROR: Uncommitted package.json changes detected:"
  git diff --name-only -- ':(top)**/package.json' 2>/dev/null
  git diff --cached --name-only -- ':(top)**/package.json' 2>/dev/null
  echo "Please commit or stash these changes before publishing."
  exit 1
fi

TIMESTAMP=$(date +%s)

echo "Publishing pre-release (version suffix: $TIMESTAMP, dist-tag: $TAG) to http://192.168.50.43"

# Stage 1: Apply prerelease version bumps to package.json files
rush publish \
  --apply \
  --partial-prerelease \
  --prerelease-name "$TIMESTAMP"

# Stage 2: Publish to Verdaccio registry
PUBLISH_EXIT=0
XDG_CONFIG_HOME="${XDG_CONFIG_HOME:-$HOME/.config}" rush publish \
  --include-all \
  --publish \
  --tag "$TAG" \
  --registry http://192.168.50.43 || PUBLISH_EXIT=$?

# Revert package.json changes made by rush publish
echo "Reverting package.json changes..."
GIT_ROOT=$(git rev-parse --show-toplevel)
CHANGED_JSONS=$(git diff --name-only -- ':(top)**/package.json' 2>/dev/null)
if [ -n "$CHANGED_JSONS" ]; then
  echo "$CHANGED_JSONS" | xargs git -C "$GIT_ROOT" checkout --
fi

if [ $PUBLISH_EXIT -ne 0 ]; then
  echo "Publishing failed with exit code $PUBLISH_EXIT"
  exit $PUBLISH_EXIT
fi

echo "Pre-release published successfully. Package.json changes reverted."