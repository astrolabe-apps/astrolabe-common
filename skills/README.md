# Astrolabe Skills

This directory contains Claude Code skills for the Astrolabe framework. Each skill provides documentation and patterns for using specific packages.

## Available Skills

### .NET Libraries

| Skill | Package | Description |
|-------|---------|-------------|
| [astrolabe-common](./astrolabe-common/) | `Astrolabe.Common` | Base utilities, exceptions, LINQ extensions |
| [astrolabe-schemas](./astrolabe-schemas/) | `Astrolabe.Schemas` | C# schema definitions bridging to TypeScript |
| [astrolabe-web-common](./astrolabe-web-common/) | `Astrolabe.Web.Common` | JWT auth and SPA hosting |
| [astrolabe-local-users](./astrolabe-local-users/) | `Astrolabe.LocalUsers` | Local user authentication backend |
| [astrolabe-file-storage](./astrolabe-file-storage/) | `Astrolabe.FileStorage` | File storage abstractions |
| [astrolabe-file-storage-azure](./astrolabe-file-storage-azure/) | `Astrolabe.FileStorage.Azure` | Azure Blob Storage implementation |
| [astrolabe-search-state](./astrolabe-search-state/) | `Astrolabe.SearchState` | Search, filtering, and pagination |
| [astrolabe-workflow](./astrolabe-workflow/) | `Astrolabe.Workflow` | Workflow execution framework |

### TypeScript/React Libraries

| Skill | Package | Description |
|-------|---------|-------------|
| [react-typed-forms-core](./react-typed-forms-core/) | `@react-typed-forms/core` | Core type-safe form state management |
| [react-typed-forms-schemas](./react-typed-forms-schemas/) | `@react-typed-forms/schemas` | Schema-driven form generation |
| [react-typed-forms-mui](./react-typed-forms-mui/) | `@react-typed-forms/mui` | Material-UI integration |
| [astroapps-client](./astroapps-client/) | `@astroapps/client` | Core React client library |
| [astroapps-client-nextjs](./astroapps-client-nextjs/) | `@astroapps/client-nextjs` | Next.js App Router integration |
| [astroapps-client-msal](./astroapps-client-msal/) | `@astroapps/client-msal` | Azure AD/MSAL authentication |
| [astroapps-client-localusers](./astroapps-client-localusers/) | `@astroapps/client-localusers` | Local user authentication UI |

### Guides

| Skill | Description |
|-------|-------------|
| [appforms-bootstrap](./appforms-bootstrap/) | Bootstrapping AppForms with C# schemas, form rendering, and visual editor |

## Skill Format

Each skill is a directory containing a `SKILL.md` file with YAML frontmatter:

```markdown
---
name: skill-name
description: Brief description of when to use this skill
---

# Skill Title

Documentation content...
```

The `name` field should be lowercase with hyphens. The `description` field tells Claude Code when to invoke this skill.

## Skill Capabilities

Each skill enables Claude Code to:

1. **Answer Usage Questions** - Understand APIs, patterns, and architecture
2. **Generate Code Examples** - Provide working code snippets for common tasks
3. **Architectural Guidance** - Recommend best practices and integration approaches
4. **Debug Issues** - Help troubleshoot common problems and errors

## Related Documentation

- [CLAUDE.md](../CLAUDE.md) - Development guidelines for this repository
- [BEST-PRACTICES.md](../BEST-PRACTICES.md) - Coding standards
- Individual library README files in their respective directories
