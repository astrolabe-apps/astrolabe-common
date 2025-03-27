# License Report Tool

A tool to generate comprehensive license reports for C# and Rush projects.

## Features

- Scans dependencies from multiple project types:
- .NET projects (via `.sln` and `.csproj` files)
- Node.js projects (via `package.json`)
- Rush.js monorepos (via `rush.json`)
- Generates consolidated reports in JSON and Excel formats
- Handles transitive dependencies

## Requirements

- .NET SDK (for nuget-license)
- Node.js and npm (for license-checker)
- Python 3 (for Excel report generation)

## Usage

Without arguments, the script searches for `.sln` files in the current directory. You can feed it `.sln`, `.csproj`, `rush.json`, or `package.json` files as arguments.

```bash
# Run with a solution file
./license-report.sh path/to/your-project.sln

# Run with a specific project file
./license-report.sh path/to/your-project.csproj

# Run with Rush monorepo
./license-report.sh path/to/rush.json

# Run with Node.js project
./license-report.sh path/to/package.json

# Mix multiple file types
./license-report.sh path/to/project.sln path/to/other/package.json
```

## Output

License reports are saved in the `./license-reports/` directory:

## Notes

Automatically checks for Rush projects in `.csproj` directories. If they are not colocated, add the `rush.json` to the arguments.

Rush projects

## Todo

- [ ] Switch from a bash script to something that doesn't make eyes bleed
- [ ] Add support for passing arguments to the underlying tools
