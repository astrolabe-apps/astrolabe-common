# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Astrolabe Common is a comprehensive full-stack framework consisting of both .NET libraries and TypeScript/React packages. The repository contains utilities for building type-safe forms, UI components, data grids, evaluators, and more.

### Key Architecture Components

**Dual Technology Stack:**
- **Backend (.NET)**: C# libraries targeting .NET 7-8 with nullable reference types enabled
- **Frontend (TypeScript/React)**: Modern React components with TypeScript, using React 18+ and @react-typed-forms as the core forms library

**Core Libraries Structure:**
- `Astrolabe.Common` - Base .NET utilities (reflection, LINQ extensions, list editing)
- `@react-typed-forms/core` - Core TypeScript forms library
- `Astrolabe.Schemas` - Schema definition system bridging .NET and TypeScript
- UI component libraries built on top of Radix UI and Tailwind CSS

## Development Commands

### .NET Projects
```bash
# Build entire solution
dotnet build Astrolabe.Common.sln

# Run .NET tests (uses xunit)
dotnet test

# Build specific project
dotnet build Astrolabe.Common/Astrolabe.Common.csproj
```

### TypeScript/React Packages (Rush Monorepo)
**Note:** Rush commands must be run from the `Astrolabe.TestTemplate/ClientApp` directory.

```bash
# Navigate to rush workspace
cd Astrolabe.TestTemplate/ClientApp

# Build all TypeScript packages
rush build

# Build specific package
rush build --to <package-name>

# Rebuild all packages (clean build)
rush rebuild

# Run tests across all packages
rush test

# Install dependencies for all packages
rush update

# Development mode
cd astrolabe-storybook && rushx dev        # Next.js dev server
cd astrolabe-storybook && rushx storybook  # Storybook on port 6007

# Linting
rush lint
```

### Key Rush Commands
- `rush build` - Build all TypeScript packages
- `rush test` - Run tests across all packages with coverage
- `rush update` - Install/update dependencies for all packages
- `rushx <command>` - Run package-specific scripts (e.g., `rushx dev`, `rushx storybook`)

## Project Structure

### .NET Solution Structure
- Solution file: `Astrolabe.Common.sln`
- Projects use SDK-style format with nullable reference types
- Common patterns: `Astrolabe.[Feature]` naming
- Test projects: `*.Tests` suffix, using xunit and FsCheck

### TypeScript Package Structure (Rush Monorepo)
- Rush monorepo with centralized dependency management
- Workspace-based dependencies using `workspace:*`
- Modern ES modules with both ESM and CommonJS exports
- TypeScript packages compile to `lib/` directory
- Peer dependencies on React 18+ and @react-typed-forms

### Key Directories
- `Astrolabe.*` - .NET library projects
- `astrolabe-*` - TypeScript packages (kebab-case)
- `schemas-*` - Schema-specific UI implementations
- `core/` - Core @react-typed-forms library
- `astrolabe-storybook/` - Storybook documentation site

## Development Patterns

### Schema-Driven Development
The framework uses a schema system where UI components are generated from type definitions. Schemas bridge .NET types and TypeScript interfaces.

### Form State Management
Uses @react-typed-forms for type-safe form state with validation. Components follow the pattern of accepting a `state` prop for form control integration.

### Component Architecture
- Base components in `astrolabe-ui` using Radix UI primitives
- Specialized implementations in `schemas-*` packages
- MUI integration via `mui/` package
- Accessibility support built-in with ARIA attributes

### Testing Strategy
- .NET: xunit with FsCheck for property-based testing
- TypeScript: Jest with ts-jest transformation
- Coverage reporting enabled by default

### Package Dependencies
- TypeScript packages use workspace references for local dependencies
- Peer dependencies for React and core form libraries
- .NET projects use ProjectReference for local dependencies

## Common Tasks

When working with forms, use the @react-typed-forms pattern with `useControl` and `Finput` components. When adding new UI components, follow the existing patterns in `astrolabe-ui` and create schema-specific versions if needed.

For .NET development, follow the existing nullable reference type patterns and use the common utilities in `Astrolabe.Common` for list editing and reflection tasks.

## Best Practices

For comprehensive development guidelines and coding standards, see [BEST-PRACTICES.md](./BEST-PRACTICES.md).