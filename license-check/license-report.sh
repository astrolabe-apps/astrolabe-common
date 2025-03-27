#!/bin/bash

# Output directories and files
OUTPUT_DIR="./license-reports"
NUGET_REPORT="$OUTPUT_DIR/nuget-licenses.json"
NPM_REPORT="$OUTPUT_DIR/npm-licenses.csv"
RUSH_REPORT="$OUTPUT_DIR/rush-dependencies.csv"

# Create output directory if it doesn't exist
mkdir -p "$OUTPUT_DIR"

echo "Generating license reports..."

# Check and run nuget-license for .NET projects
if ! command -v nuget-license &> /dev/null; then
    echo "nuget-license not found. Installing..."
    dotnet tool install --global nuget-license
fi

echo "Running nuget-license..."
# Check if solution file is provided
if [ -z "$1" ]; then
    echo "No solution file specified. Searching for .sln files..."
    SLN_FILES=(*.sln)
    if [ ${#SLN_FILES[@]} -eq 0 ] || [ "${SLN_FILES[0]}" == "*.sln" ]; then
        echo "No .sln files found in current directory."
    else
        echo "Found solution file: ${SLN_FILES[0]}"
        nuget-license --input "${SLN_FILES[0]}" --include-transitive --output JsonPretty --file-output "$NUGET_REPORT"
        echo "NuGet license report generated at $NUGET_REPORT"
    fi
else
    nuget-license --input "$1" --include-transitive --output JsonPretty --file-output "$NUGET_REPORT"
    echo "NuGet license report generated at $NUGET_REPORT"
fi

# Set up the header for Rush projects license report
echo "PackageName,Version,License,Repository" > "$RUSH_REPORT"

# Process Rush projects
echo "Processing Rush-managed projects..."
if [ -f "rush.json" ]; then
    RUSH_ROOT="$(pwd)"
    # Extract project folders from rush.json
    PROJECTS=$(grep -o '"projectFolder": "[^"]*"' rush.json | cut -d'"' -f4)

    for PROJECT in $PROJECTS; do
        if [ -f "$PROJECT/package.json" ]; then
            echo "Processing $PROJECT..."
            cd "$RUSH_ROOT/$PROJECT" || continue

            # Use npm list to get dependency info
            DEPS=$(npm list --all --json 2>/dev/null | jq -r '.dependencies | to_entries[] | [.key, .value.version, .value.license // "Unknown", .value.repository.url // "Unknown"] | @csv')
            if [ -n "$DEPS" ]; then
                echo "$DEPS" >> "$RUSH_ROOT/$RUSH_REPORT"
            fi

            cd "$RUSH_ROOT" || exit
        fi
    done
    echo "Rush dependencies report generated at $RUSH_REPORT"
else
    echo "rush.json not found. Skipping Rush projects."
fi

# Check and run standard license-checker for any regular npm projects
if ! command -v license-checker &> /dev/null; then
    echo "license-checker not found. Installing..."
    npm install -g license-checker
fi

echo "Running license-checker for regular npm projects..."
if [ -f "package.json" ] && [ ! -f "rush.json" ]; then
    license-checker --csv --out "$NPM_REPORT"
    echo "NPM license report generated at $NPM_REPORT"
else
    echo "Not a standard npm project root (or is a Rush root). Skipping regular npm license check."
fi

echo "License reports generated in $OUTPUT_DIR"