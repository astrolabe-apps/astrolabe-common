#!/bin/bash
# Check which published packages have changes since their last published tag.
# Tag format: @scope/package-name_vX.Y.Z
# Project folders in rush.json are relative to Astrolabe.TestTemplate/

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")" && pwd)"
RUSH_JSON="$REPO_ROOT/Astrolabe.TestTemplate/rush.json"

# Parse rush.json using Node.js (strip JSON5 comments respecting strings)
packages=$(node --input-type=module -e "
import { readFileSync } from 'fs';
const text = readFileSync('$RUSH_JSON', 'utf8');
// Strip comments while respecting string literals
let result = '', i = 0;
while (i < text.length) {
  if (text[i] === '\"') {
    let j = i + 1;
    while (j < text.length && text[j] !== '\"') {
      if (text[j] === '\\\\') j++;
      j++;
    }
    result += text.slice(i, j + 1);
    i = j + 1;
  } else if (text[i] === '/' && text[i+1] === '/') {
    while (i < text.length && text[i] !== '\n') i++;
  } else if (text[i] === '/' && text[i+1] === '*') {
    i += 2;
    while (i < text.length && !(text[i] === '*' && text[i+1] === '/')) i++;
    i += 2;
  } else {
    result += text[i++];
  }
}
// Remove trailing commas
result = result.replace(/,(\s*[}\]])/g, '\$1');
const data = JSON.parse(result);
for (const p of data.projects) {
  if (p.shouldPublish || p.versionPolicyName) {
    console.log(p.packageName + '|' + p.projectFolder);
  }
}
")

# Find the most recent publish tag by date across all packages
latest_publish_tag=""
latest_publish_date=0

while IFS='|' read -r pkg_name project_folder; do
    tag_pattern="${pkg_name}_v*"
    tag=$(git -C "$REPO_ROOT" tag --list "$tag_pattern" --sort=-v:refname | head -1 || true)
    if [ -n "$tag" ]; then
        tag_date=$(git -C "$REPO_ROOT" log -1 --format=%ct "$tag" 2>/dev/null || echo 0)
        if [ "$tag_date" -gt "$latest_publish_date" ]; then
            latest_publish_date=$tag_date
            latest_publish_tag=$tag
        fi
    fi
done <<< "$packages"

if [ -z "$latest_publish_tag" ]; then
    echo "No publish tags found."
    exit 1
fi

tag_date_human=$(git -C "$REPO_ROOT" log -1 --format=%ci "$latest_publish_tag")
echo "Comparing against most recent publish: $latest_publish_tag ($tag_date_human)"
echo ""

changed_latest=()
changed_own=()
unchanged=()
no_tag=()

while IFS='|' read -r pkg_name project_folder; do
    abs_folder="$(cd "$REPO_ROOT/Astrolabe.TestTemplate/$project_folder" && pwd)"
    rel_folder="${abs_folder#$REPO_ROOT/}"

    # Find this package's own latest tag
    tag_pattern="${pkg_name}_v*"
    own_tag=$(git -C "$REPO_ROOT" tag --list "$tag_pattern" --sort=-v:refname | head -1 || true)
    if [ -n "$own_tag" ]; then
        version="${own_tag#${pkg_name}_v}"
    else
        version="(no tag)"
    fi

    # Check changes since latest publish across all packages
    changed_files_latest=$(git -C "$REPO_ROOT" diff --name-only "$latest_publish_tag"..HEAD -- "$rel_folder")

    if [ -n "$changed_files_latest" ]; then
        changed_latest+=("$pkg_name@$version|$changed_files_latest")
    elif [ -z "$own_tag" ]; then
        no_tag+=("$pkg_name ($rel_folder)")
    else
        # Not changed since latest publish - check against own tag
        changed_files_own=$(git -C "$REPO_ROOT" diff --name-only "$own_tag"..HEAD -- "$rel_folder")
        if [ -n "$changed_files_own" ]; then
            changed_own+=("$pkg_name@$version|$changed_files_own")
        else
            unchanged+=("$pkg_name@$version")
        fi
    fi
done <<< "$packages"

if [ ${#changed_latest[@]} -gt 0 ]; then
    echo "=== Packages with changes since last publish ==="
    for item in "${changed_latest[@]}"; do
        header="${item%%|*}"
        files="${item#*|}"
        echo "  * $header"
        while IFS= read -r file; do
            echo "      - $file"
        done <<< "$files"
    done
    echo ""
fi

if [ ${#changed_own[@]} -gt 0 ]; then
    echo "=== Packages with changes since own release ==="
    for item in "${changed_own[@]}"; do
        header="${item%%|*}"
        files="${item#*|}"
        echo "  * $header"
        while IFS= read -r file; do
            echo "      - $file"
        done <<< "$files"
    done
    echo ""
fi

if [ ${#no_tag[@]} -gt 0 ]; then
    echo "=== Packages with no published tag ==="
    for item in "${no_tag[@]}"; do
        echo "  ? $item"
    done
    echo ""
fi

if [ ${#unchanged[@]} -gt 0 ]; then
    echo "=== Packages with no changes ==="
    for item in "${unchanged[@]}"; do
        echo "    $item"
    done
    echo ""
fi

echo "Summary: ${#changed_latest[@]} changed since last publish, ${#changed_own[@]} changed since own release, ${#unchanged[@]} unchanged, ${#no_tag[@]} no tag"
