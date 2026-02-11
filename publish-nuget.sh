#!/bin/bash
set -e

PACK_DIR="./nupkgs"
NUGET_SOURCE="https://api.nuget.org/v3/index.json"

# Check for API key
if [ -z "$NUGET_API_KEY" ]; then
    echo "Error: NUGET_API_KEY environment variable is not set."
    echo "Usage: NUGET_API_KEY=your-key ./publish-nuget.sh"
    exit 1
fi

# Clean output
rm -rf "$PACK_DIR"
mkdir -p "$PACK_DIR"

# Pack each project individually to avoid one failure blocking all
echo "Building and packing..."
for proj in *//*.csproj; do
    dotnet pack "$proj" -c Release -o "$PACK_DIR" --nologo -v quiet 2>/dev/null && true
done

packages=("$PACK_DIR"/*.nupkg)
if [ ! -f "${packages[0]}" ]; then
    echo "Error: No packages were produced."
    exit 1
fi

# Find new packages by checking against NuGet
new_packages=()
echo "Checking NuGet for existing versions..."
for pkg in "$PACK_DIR"/*.nupkg; do
    [ -f "$pkg" ] || continue
    filename=$(basename "$pkg" .nupkg)
    # Split into name and version
    name=$(echo "$filename" | sed 's/\.\([0-9][0-9]*\.[0-9][0-9]*\.[0-9][0-9]*.*\)$//')
    version=$(echo "$filename" | sed 's/.*\.\([0-9][0-9]*\.[0-9][0-9]*\.[0-9][0-9]*.*\)$/\1/')

    # Check if this version exists on NuGet
    status=$(curl -s -o /dev/null -w "%{http_code}" "https://api.nuget.org/v3-flatcontainer/${name,,}/index.json" 2>/dev/null)
    if [ "$status" = "200" ]; then
        versions=$(curl -s "https://api.nuget.org/v3-flatcontainer/${name,,}/index.json" 2>/dev/null)
        if echo "$versions" | grep -q "\"${version,,}\""; then
            continue
        fi
    fi
    new_packages+=("$pkg|$name|$version")
done

if [ ${#new_packages[@]} -eq 0 ]; then
    echo "No new package versions to publish."
    exit 0
fi

echo ""
echo "New package versions to publish:"
echo "================================"
for entry in "${new_packages[@]}"; do
    name=$(echo "$entry" | cut -d'|' -f2)
    version=$(echo "$entry" | cut -d'|' -f3)
    printf "  %-45s %s\n" "$name" "$version"
done
echo ""

read -p "Publish these packages? [y/N] " confirm
if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
    echo "Aborted."
    exit 0
fi

echo ""
for entry in "${new_packages[@]}"; do
    pkg=$(echo "$entry" | cut -d'|' -f1)
    name=$(echo "$entry" | cut -d'|' -f2)
    version=$(echo "$entry" | cut -d'|' -f3)
    echo "Publishing $name $version..."
    dotnet nuget push "$pkg" -s "$NUGET_SOURCE" -k "$NUGET_API_KEY" --skip-duplicate
    git tag "${name}_v${version}"
done

echo ""
echo "Pushing tags..."
git push --tags

echo "Done."
