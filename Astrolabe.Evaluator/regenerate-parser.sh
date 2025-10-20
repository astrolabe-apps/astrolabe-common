#!/bin/bash

# Script to regenerate ANTLR parser for Astrolabe.Evaluator
# This generates C# code from the ANTLR grammar files

set -e  # Exit on error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

ANTLR_VERSION="4.13.1"
ANTLR_JAR="/tmp/antlr-${ANTLR_VERSION}-complete.jar"
ANTLR_URL="https://www.antlr.org/download/antlr-${ANTLR_VERSION}-complete.jar"

# Check if Java is installed
if ! command -v java &> /dev/null; then
    echo "Error: Java is not installed. Please install Java to run ANTLR."
    exit 1
fi

# Download ANTLR if not present
if [ ! -f "$ANTLR_JAR" ]; then
    echo "Downloading ANTLR ${ANTLR_VERSION}..."
    wget -q "$ANTLR_URL" -O "$ANTLR_JAR"
    echo "Downloaded ANTLR to $ANTLR_JAR"
fi

# Generate parser
echo "Generating C# parser from ANTLR grammar files..."

java -jar "$ANTLR_JAR" \
    -Dlanguage=CSharp \
    -visitor \
    -package Astrolabe.Evaluator.Parser \
    -o Generated/Astrolabe/Evaluator/Parser \
    AstroExprLexer.g4 \
    AstroExprParser.g4

echo "Parser generation complete!"
echo "Generated files are in: Generated/Astrolabe/Evaluator/Parser/"
