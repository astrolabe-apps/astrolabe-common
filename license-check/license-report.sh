#!/bin/bash

# Output directories and files
OUTPUT_DIR="./license-reports"
NUGET_REPORT="$OUTPUT_DIR/nuget-licenses.json"
NPM_REPORT="$OUTPUT_DIR/npm-licenses.json"
RUSH_REPORT="$OUTPUT_DIR/rush-dependencies.csv"

# Create output directory if it doesn't exist
mkdir -p "$OUTPUT_DIR"

echo "Generating license reports..."

# Function to find rush.json by traversing up from current directory
find_rush_root() {
    local current_dir="$1"
    while [[ "$current_dir" != "/" ]]; do
        if [[ -f "$current_dir/rush.json" ]]; then
            echo "$current_dir"
            return 0
        fi
        current_dir=$(dirname "$current_dir")
    done
    return 1
}


extract_csproj_files() {
    local SLN_FILE="$1"
    grep -o '"[^"]*\.csproj"' "$SLN_FILE" | tr -d '"' | tr '\\' '/' || echo ""
}

process_rush_file() {
    local RUSH_FILE="$1"
    local RUSH_ROOT=$(dirname "$RUSH_FILE")
    echo "Processing Rush root at: $RUSH_ROOT"

    # Save current directory to return to later
    local ORIGINAL_DIR="$(pwd)"
    cd "$RUSH_ROOT" || exit

    # Extract project folders from rush.json
    local PROJECTS=$(grep -o '"projectFolder": "[^"]*"' rush.json | cut -d'"' -f4)

    # Set up the header for Rush projects license report if it doesn't exist
    if [ ! -f "$ORIGINAL_DIR/$RUSH_REPORT" ] || [ ! -s "$ORIGINAL_DIR/$RUSH_REPORT" ]; then
        echo "PackageName,Version,License,Repository" > "$ORIGINAL_DIR/$RUSH_REPORT"
    fi

    for PROJECT in $PROJECTS; do
        if [ -f "$PROJECT/package.json" ]; then
            echo "Processing Rush project: $PROJECT..."
            # Call process_package_json with an additional parameter to indicate it's from Rush
            process_package_json "$RUSH_ROOT/$PROJECT/package.json" "$ORIGINAL_DIR/$RUSH_REPORT" "rush"
        fi
    done

    # Return to original directory
    cd "$ORIGINAL_DIR" || exit
}


process_package_json() {
    local PKG_FILE="$1"
    local PKG_DIR=$(dirname "$PKG_FILE")
    local OUTPUT_FILE="$2"
    local SOURCE="$3"  # Optional parameter: "rush" if called from process_rush_file

    echo "Processing package.json at: $PKG_DIR"

    # Save current directory to return to later
    local ORIGINAL_DIR="$(pwd)"
    cd "$PKG_DIR" || exit

    # Check if this is part of a Rush project and not explicitly processed as Rush
    if [ "$SOURCE" != "rush" ] && find_rush_root "$PKG_DIR" > /dev/null; then
        echo "This package.json appears to be part of a Rush project. Skipping direct processing."
    else
        # Install license-checker if needed
        if ! command -v license-checker &> /dev/null; then
            echo "license-checker not found. Installing..."
            npm install -g license-checker
        fi

        # Use different approaches based on source
        if [ "$SOURCE" = "rush" ]; then
            # For Rush projects, also use license-checker but append to the Rush report
            echo "Processing as part of Rush project..."
            license-checker --json | jq -r 'to_entries[] |
              (.key | capture("^(?<name>.+)@(?<version>[0-9]+\\.[0-9]+\\.[0-9]+.*)$")? //
                     {"name": .key, "version": "Unknown"}) as $pkg_info |
              [$pkg_info.name, $pkg_info.version, (.value.licenses // "Unknown"), (.value.repository // "Unknown")] |
              @csv' >> "$OUTPUT_FILE"
        else
            # For standalone projects, use license-checker with direct output
            echo "Processing as standalone npm project..."

            # Generate a unique filename for this package
            local PKG_NAME=$(basename "$PKG_DIR")
            local NPM_REPORT_FOR_PKG="$OUTPUT_DIR/npm-licenses-$PKG_NAME.json"

            # If no output file is specified, use the default
            if [ -z "$OUTPUT_FILE" ]; then
                OUTPUT_FILE="$NPM_REPORT_FOR_PKG"
            fi

            license-checker --json --out "$OUTPUT_FILE"
            echo "NPM license report generated at $OUTPUT_FILE"
        fi
    fi

    # Return to original directory
    cd "$ORIGINAL_DIR" || exit
}

process_csproj_file() {
    local CSPROJ_PATH="$1"
    local CSPROJ_DIR="$(cd "$(dirname "$CSPROJ_PATH")" && pwd)"
    local CSPROJ_FILENAME=$(basename "$CSPROJ_PATH")
    local SKIP_NUGET_SCAN="${2:-false}"  # Optional parameter to skip nuget scan

    echo "Processing csproj file: $CSPROJ_PATH"

    # Process .NET dependencies with nuget-license unless told to skip
    if [ "$SKIP_NUGET_SCAN" != "true" ]; then
        nuget-license --input "$CSPROJ_PATH" --include-transitive --output JsonPretty --file-output "$NUGET_REPORT"
        echo "NuGet license report generated at $NUGET_REPORT"
    fi

    # Only check for rush.json if no rush.json or package.json was explicitly provided
    if [ "$CHECK_CSPROJ_DIRS" = true ]; then
        echo "Checking for rush.json in: $CSPROJ_DIR"

        if [ -f "$CSPROJ_DIR/rush.json" ]; then
            echo "Found rush.json in $CSPROJ_DIR"
            process_rush_file "$CSPROJ_DIR/rush.json"
        else
            echo "No rush.json found in $CSPROJ_DIR"
        fi

        # Also check for package.json
        if [ -f "$CSPROJ_DIR/package.json" ]; then
            echo "Found package.json in $CSPROJ_DIR"
            process_package_json "$CSPROJ_DIR/package.json"
        fi
    else
        echo "Skipping rush.json check in .csproj directory (explicit files provided)"
    fi
}


process_solution_file() {
    local SOLUTION_PATH="$1"
    local SOLUTION_DIR="$(cd "$(dirname "$SOLUTION_PATH")" && pwd)"
    local SLN_FILENAME=$(basename "$SOLUTION_PATH")

    echo "Processing solution file: $SOLUTION_PATH"

    # Process .NET dependencies with nuget-license at solution level for efficiency
    nuget-license --input "$SOLUTION_PATH" --include-transitive --output JsonPretty --file-output "$NUGET_REPORT"
    echo "NuGet license report generated at $NUGET_REPORT"

    # Only check for rush.json if no rush.json or package.json was explicitly provided
    if [ "$CHECK_CSPROJ_DIRS" = true ]; then
        echo "Extracting .csproj files from solution..."

        # Extract all .csproj files from the solution
        local CSPROJ_PATHS=$(extract_csproj_files "$SOLUTION_PATH")

        if [ -n "$CSPROJ_PATHS" ]; then
            echo "Found the following .csproj files:"
            echo "$CSPROJ_PATHS"

            # Process each directory containing a .csproj
            for CSPROJ in $CSPROJ_PATHS; do
                # Get the absolute path to the .csproj
                local CSPROJ_ABS_PATH
                if [[ "$CSPROJ" == /* ]]; then
                    CSPROJ_ABS_PATH="$CSPROJ"
                else
                    CSPROJ_ABS_PATH="$SOLUTION_DIR/$CSPROJ"
                fi

                # Process the csproj file but skip the nuget scan since we already did it at solution level
                process_csproj_file "$CSPROJ_ABS_PATH" "true"
            done
        else
            echo "No .csproj files found in the solution."
        fi
    else
        echo "Skipping rush.json check in .csproj directories (explicit files provided)"
    fi
}

# Check if nuget-license is installed
if ! command -v nuget-license &> /dev/null; then
    echo "nuget-license not found. Installing..."
    dotnet tool install --global nuget-license
fi

# Set up the header for Rush projects license report
echo "PackageName,Version,License,Repository" > "$RUSH_REPORT"

# Track whether we've already processed package.json in current directory
PROCESSED_CURRENT_PKG=false

# Flag to check if we need to search for rush.json in .csproj directories
CHECK_CSPROJ_DIRS=true

# Check if any rush.json or package.json files are explicitly provided
for arg in "$@"; do
    if [[ "$arg" == *rush.json ]] || [[ "$arg" == *package.json ]]; then
        CHECK_CSPROJ_DIRS=false
        break
    fi
done
# Process arguments
if [ $# -eq 0 ]; then
    echo "No files specified. Searching for .sln files in current directory..."
    SLN_FILES=(*.sln)
    if [ ${#SLN_FILES[@]} -eq 0 ] || [ "${SLN_FILES[0]}" == "*.sln" ]; then
        echo "No .sln files found in current directory."
    else
        echo "Found solution file: ${SLN_FILES[0]}"
        process_solution_file "${SLN_FILES[0]}"
    fi
else
    # Process each argument
    for arg in "$@"; do
        if [[ "$arg" == *rush.json ]]; then
            echo "Processing Rush file: $arg"
            process_rush_file "$arg"
        elif [[ "$arg" == *.sln ]]; then
            echo "Processing Solution file: $arg"
            process_solution_file "$arg"
        elif [[ "$arg" == *.csproj ]]; then
            echo "Processing Project file: $arg"
            process_csproj_file "$arg"
        elif [[ "$arg" == *package.json ]]; then
            echo "Processing package.json file: $arg"
            process_package_json "$arg"
            # Check if this is the package.json in current directory
            if [[ "$(realpath "$arg")" == "$(realpath "./package.json")" ]]; then
                PROCESSED_CURRENT_PKG=true
            fi
        else
            echo "Unrecognized file type: $arg"
            echo "Please provide .sln, .csproj, rush.json, or package.json files."
        fi
    done
fi

# Check and run standard license-checker for any regular npm projects in current dir
# Only if we haven't already processed it via command line arguments
if [ "$PROCESSED_CURRENT_PKG" = false ] && [ -f "package.json" ] && ! find_rush_root "$(pwd)" > /dev/null; then
    echo "Processing package.json in current directory..."
    if ! command -v license-checker &> /dev/null; then
        echo "license-checker not found. Installing..."
        npm install -g license-checker
    fi
    license-checker --json --out "$NPM_REPORT"
    echo "NPM license report generated at $NPM_REPORT"
else
    echo "Skipping package.json in current directory (already processed or part of Rush project)."
fi

echo "License reports generated in $OUTPUT_DIR"

if ! command -v pipx &> /dev/null; then
    echo "pipx not found. Installing..."
    if ! command -v python3 &> /dev/null; then
        echo "Python 3 not found. Installing..."
        sudo apt-get update && sudo apt-get install -y python3-full
    fi

    sudo apt-get update && sudo apt-get install -y pipx
    python3 -m pipx ensurepath

    if [ -f ~/.bashrc ]; then
        source ~/.bashrc
    fi
fi

pipx run --spec pandas --spec openpyxl python "generate-reports.py"
