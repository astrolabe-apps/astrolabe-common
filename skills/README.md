# Astrolabe Library Skills for Claude Code

This directory contains Claude Code skill files that provide comprehensive knowledge about Astrolabe libraries. These skills enable Claude Code to assist with development using the Astrolabe framework.

## What are Skills?

Skills are specialized knowledge domains that enhance Claude Code's ability to help you work with specific libraries and frameworks. Each skill file contains:

- Library overview and architecture
- Key concepts and patterns
- API references with examples
- Integration guidance
- Troubleshooting tips
- Best practices

## How to Use These Skills

### Option 1: Copy to Your Project

Copy the `skills/` directory (or individual skill files) to your project's `.claude/skills/` directory:

```bash
# Copy all skills
cp -r skills/ /path/to/your/project/.claude/skills/

# Or copy specific skills you need
cp skills/dotnet/astrolabe-schemas.md /path/to/your/project/.claude/skills/
cp skills/typescript/react-typed-forms-core.md /path/to/your/project/.claude/skills/
```

### Option 2: Invoke Skills Directly

When working in this repository, invoke skills using the `/skill` command or by referencing them in your prompts:

```
# Example: Get help with schemas
Can you help me create a schema using the astrolabe-schemas skill?

# Example: Generate form code
Using react-typed-forms-core, create a form with validation
```

## Available Skills

### .NET Libraries

| Skill File | Library | Purpose |
|------------|---------|---------|
| `dotnet/astrolabe-common.md` | Astrolabe.Common | Base utilities, LINQ extensions, list editing |
| `dotnet/astrolabe-schemas.md` | Astrolabe.Schemas | Schema definitions bridging .NET to TypeScript |
| `dotnet/astrolabe-web-common.md` | Astrolabe.Web.Common | JWT authentication, SPA hosting |
| `dotnet/astrolabe-local-users.md` | Astrolabe.LocalUsers | User management, email verification, MFA |
| `dotnet/astrolabe-file-storage.md` | Astrolabe.FileStorage | File storage abstractions |
| `dotnet/astrolabe-file-storage-azure.md` | Astrolabe.FileStorage.Azure | Azure Blob Storage implementation |
| `dotnet/astrolabe-search-state.md` | Astrolabe.SearchState | Generic search state management |
| `dotnet/astrolabe-workflow.md` | Astrolabe.Workflow | Workflow execution patterns |

### TypeScript/React Libraries

| Skill File | Library | Purpose |
|------------|---------|---------|
| `typescript/react-typed-forms-core.md` | @react-typed-forms/core | Type-safe form state management |
| `typescript/react-typed-forms-schemas.md` | @react-typed-forms/schemas | Schema-driven form generation |
| `typescript/react-typed-forms-mui.md` | @react-typed-forms/mui | Material-UI integration |

## Skill Capabilities

Each skill enables Claude Code to:

1. **Answer Usage Questions** - Understand APIs, patterns, and architecture
2. **Generate Code Examples** - Provide working code snippets for common tasks
3. **Architectural Guidance** - Recommend best practices and integration approaches
4. **Debug Issues** - Help troubleshoot common problems and errors

## Contributing

To add new skills or improve existing ones:

1. Follow the structure of existing skill files
2. Include practical code examples
3. Reference actual library code and documentation
4. Test that the skill helps Claude Code provide accurate assistance

## Related Documentation

- [CLAUDE.md](../CLAUDE.md) - Development guidelines for this repository
- [BEST-PRACTICES.md](../BEST-PRACTICES.md) - Coding standards
- Individual library README files in their respective directories
