# Astrolabe Template Generator - Project Plan

## Overview

The Astrolabe Template Generator creates full-stack application scaffolds with a .NET backend and Rush monorepo frontend structure. This document tracks completed work and outlines remaining tasks.

**Current Structure:**

```
Astrolabe.TemplateGenerator/
├── Templates/
│   ├── Backend/
│   │   ├── appsettings.json
│   │   ├── appsettings.Development.json
│   │   └── [.NET project files]
│   └── Frontend/
│       ├── rush.json
│       ├── client-common/
│       │   └── package.json (API client generation)
│       ├── astrolabe-ui/
│       │   └── package.json (UI components)
│       └── sites/
│           └── __SiteName__/
│               ├── package.json (Next.js site)
│               ├── next.config.js
│               ├── postcss.config.js
│               ├── tailwind.config.js
│               └── src/
│                   └── app/
│                       ├── layout.tsx
│                       └── page.tsx
├── TemplateGenerator.cs
├── Program.cs
├── AppConfiguration.cs
└── PROJECT-PLAN.md (this file)
```

### Template Variable Substitution

**Implemented Variables:**

- `__AppName__` - Application name (e.g., "tea1")
- `__SiteName__` - Site name (e.g., "tea1-site")
- `__Description__` - Project description
- `__HttpPort__` - Backend HTTP port (default: 5000)
- `__HttpsPort__` - Backend HTTPS port (default: 5001)
- `__SpaPort__` - Frontend dev server port (default: 8000)
- `__ConnectionString__` - Database connection string

---

## 🚧 In Progress / Remaining Tasks

### 1. Backend Template Enhancement

#### 1.1 Basic Backend Structure

- [ ] Add complete .NET project structure
  - [ ] Program.cs with minimal configuration
  - [ ] Controllers folder with sample controller
  - [ ] Models/Entities folder
  - [ ] DbContext setup (if using EF Core)
  - [ ] Swagger/OpenAPI configuration

#### 1.2 Code Generation Endpoints

- [ ] Implement `/api/CodeGen/Schemas` endpoint

  - Generate TypeScript schema definitions from .NET types
  - Export schema metadata for forms

- [ ] Implement `/api/CodeGen/Forms` endpoint
  - Generate form definitions from .NET models
  - Export validation rules and field configurations

#### 1.3 Database Setup

- [ ] Add EF Core migrations setup
- [ ] Create initial migration
- [ ] Add seed data configuration
- [ ] Configure database provider (SQL Server/PostgreSQL/SQLite)

### 2. CRUD Functionality

#### 2.1 Backend CRUD

- [ ] Create generic CRUD base controller
- [ ] Implement repository pattern (optional)
- [ ] Add example entity model
- [ ] Create CRUD endpoints for example entity:
  - GET /api/{entity} (list with pagination)
  - GET /api/{entity}/{id} (single)
  - POST /api/{entity} (create)
  - PUT /api/{entity}/{id} (update)
  - DELETE /api/{entity}/{id} (delete)

#### 2.2 Frontend CRUD

- [ ] Add example CRUD pages in site:

  - List view with data grid
  - Detail/Edit form
  - Create form
  - Delete confirmation

- [ ] Implement client-side data fetching
- [ ] Add form validation using @react-typed-forms
- [ ] Add error handling and loading states
- [ ] Implement optimistic updates

### 3. Authentication & Authorization

#### 3.1 Backend Auth

- [ ] Choose auth strategy (JWT/Cookie/Identity)
- [ ] Add authentication middleware
- [ ] Add authorization policies
- [ ] Create login/register endpoints
- [ ] Add user management

#### 3.2 Frontend Auth

- [ ] Add login page
- [ ] Add registration page
- [ ] Implement auth context/provider
- [ ] Add protected routes
- [ ] Handle token refresh
- [ ] Add logout functionality

### 4. Frontend Template Enhancement

#### 4.1 UI Components

Setting up our own ShadCN registry.

- [ ] Complete `astrolabe-ui` package:
  - [ ] Button variants
  - [ ] Input components
  - [ ] Form components
  - [ ] Card/Container components
  - [ ] Navigation components
  - [ ] Modal/Dialog components
  - [ ] Toast/Notification system

#### 4.2 Layouts & Navigation

- [ ] Add main layout with navigation
- [ ] Add sidebar/header components
- [ ] Add footer
- [ ] Add responsive navigation for mobile
- [ ] Add breadcrumbs

#### 4.3 Data Grid

- [ ] Add data grid component using @astroapps/schemas-datagrid
- [ ] Configure sorting
- [ ] Configure filtering
- [ ] Configure pagination
- [ ] Add row selection
- [ ] Add export functionality

### 5. API Client Generation

#### 5.1 Client-Common Setup

- [ ] Verify NSwag configuration
- [ ] Add retry logic
- [ ] Add request interceptors
- [ ] Add response error handling
- [ ] Add TypeScript types generation
- [ ] Test schema generation endpoint
- [ ] Test forms generation endpoint

### 6. Build & Deployment

#### 6.1 Backend Build

- [ ] Configure release builds
- [ ] Add Docker support (optional)
- [ ] Add health check endpoints
- [ ] Configure logging
- [ ] Add environment-specific configs

#### 6.2 Frontend Build

- [ ] Configure production builds via Rush
- [ ] Optimize bundle size
- [ ] Add build scripts to template generator
- [ ] Configure static export
- [ ] Add deployment documentation

### 7. Testing

#### 7.1 Backend Tests

- [ ] Add xUnit test project
- [ ] Add unit tests for services
- [ ] Add integration tests for controllers
- [ ] Add database seeding for tests

#### 7.2 Frontend Tests

- [ ] Add Vitest configuration
- [ ] Add component tests
- [ ] Add integration tests
- [ ] Add E2E tests (optional - Cypress)

### 8. Documentation

#### 8.1 Developer Documentation

- [ ] Add README.md to generated project
- [ ] Document Rush commands
- [ ] Document API endpoints
- [ ] Document component usage
- [ ] Add code examples

#### 8.2 User Documentation

- [ ] Create user guide for template generator
- [ ] Document configuration options
- [ ] Add troubleshooting guide
- [ ] Add FAQ section

### 9. Template Generator Enhancements

#### 9.1 CLI Improvements

- [ ] Add interactive prompts for configuration
- [ ] Add validation for user inputs
- [ ] Add option to skip frontend/backend
- [ ] Add option to choose database provider
- [ ] Add option to choose auth strategy
- [ ] Add dry-run mode

#### 9.2 Template Variants

- [ ] Create minimal template (no auth, basic CRUD)
- [ ] Create full-featured template (auth, CRUD, admin)
- [ ] Create API-only template (no frontend)
- [ ] Create static site template (no backend)

### 10. Additional Features

#### 10.1 Error Handling

- [ ] Add global error boundary in frontend
- [ ] Add error logging
- [ ] Add user-friendly error messages
- [ ] Add error tracking integration (optional - Sentry)

#### 10.2 Performance

- [ ] Add caching strategy
- [ ] Add lazy loading for routes
- [ ] Add code splitting
- [ ] Add service worker (optional - PWA)

#### 10.3 Developer Experience

- [ ] Add hot reload for backend (dotnet watch)
- [ ] Ensure hot reload works for frontend
- [ ] Add code formatting (Prettier)
- [ ] Add linting (ESLint)
- [ ] Add git hooks (Husky - optional)

---

## 🎯 Priority Order

### Phase 1: Core Functionality (Highest Priority)

1. Complete basic backend structure (1.1)
2. Implement code generation endpoints (1.2)
3. Add backend CRUD functionality (2.1)
4. Complete API client generation (5.1)
5. Add frontend CRUD pages (2.2)

### Phase 2: Essential Features

1. Add authentication (3.1, 3.2)
2. Complete UI components (4.1)
3. Add layouts and navigation (4.2)
4. Add data grid (4.3)

### Phase 3: Polish & Enhancement

1. Add testing infrastructure (7.1, 7.2)
2. Improve documentation (8.1, 8.2)
3. Add error handling (10.1)
4. Optimize performance (10.2)

### Phase 4: Advanced Features

1. Add template variants (9.2)
2. Enhance CLI (9.1)
3. Add deployment configuration (6.1, 6.2)
4. Add optional features (10.3)

---

## 📝 Notes

### Known Issues

- Turbopack has Windows path resolution issues - using webpack mode instead
- Peer dependency warnings for some packages (non-critical)

### Design Decisions

1. **Rush over Lerna/Yarn workspaces**: Better suited for large monorepos, better caching
2. **Webpack over Turbopack**: Better Windows support and stability
3. **pnpm over npm/yarn**: Faster, more efficient disk usage
4. **Next.js 16**: Latest stable with App Router
5. **@react-typed-forms**: Type-safe forms with schema generation

### Future Considerations

- Consider adding mobile app template (React Native/Expo)
- Authentication

---

## 🔗 Related Documentation

- [Rush Documentation](https://rushjs.io)
- [Next.js Documentation](https://nextjs.org/docs)
- [pnpm Workspaces](https://pnpm.io/workspaces)
- [Astrolabe Common CLAUDE.md](../CLAUDE.md)
- [Astrolabe Common BEST-PRACTICES.md](../BEST-PRACTICES.md)
