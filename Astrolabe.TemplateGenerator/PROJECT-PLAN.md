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

## ✅ Completed Tasks

### Backend Template - Phase 1 Core Functionality
- ✅ Complete .NET project structure with Program.cs, controllers, models
- ✅ Swagger/OpenAPI configuration with proper operation IDs and server URL
- ✅ DbContext setup (AppDbContext with EF Core)
- ✅ EF Core migrations setup with auto-migration on startup
- ✅ SQL Server database provider configured
- ✅ `/api/CodeGen/Schemas` endpoint - generates TypeScript schema definitions
- ✅ `/api/CodeGen/Forms` endpoint - generates form definitions from .NET models
- ✅ `/api/CodeGen/SchemasSchemas` endpoint - generates editor schemas
- ✅ FormService for form definition management with JSON file persistence
- ✅ Sample Tea entity model (TeaType enum, MilkAmount enum)
- ✅ Complete TeasController with all CRUD endpoints following BEST-PRACTICES.md:
  - ✅ GET /api/teas (returns List<TeaInfo>)
  - ✅ GET /api/teas/{id} (returns TeaView)
  - ✅ POST /api/teas (accepts TeaEdit, returns TeaView)
  - ✅ PUT /api/teas/{id} (accepts TeaEdit, returns TeaView)
  - ✅ DELETE /api/teas/{id}
- ✅ DTOs following BEST-PRACTICES naming conventions:
  - ✅ TeaEdit - for POST/PUT operations with editable fields
  - ✅ TeaInfo - lightweight record for list views
  - ✅ TeaView - extends TeaEdit with Id for detailed GET operations
- ✅ AppForms implementation following BEST-PRACTICES pattern:
  - ✅ TeaEditorForm - specific form class with Tea property containing TeaEdit
  - ✅ TeaSearchForm - for search/list page with filters and results
- ✅ Exception-based error handling (NotFoundException.ThrowIfNull pattern)
- ✅ JSON serialization with standard options

### Frontend Template - Phase 1 Core Functionality
- ✅ Rush monorepo structure with pnpm workspaces
- ✅ Next.js 16 site template with App Router
- ✅ Tailwind CSS + PostCSS configuration
- ✅ TypeScript configuration across all packages
- ✅ astrolabe-ui package with basic Button component and mkIcon helper
- ✅ client-common package with:
  - ✅ NSwag API client generation script
  - ✅ Schema generation integration (gencode script)
  - ✅ Form definitions generation
  - ✅ Editor schemas generation (geneditorschemas script)
- ✅ Custom form renderer (renderers.ts)
- ✅ Routes configuration system (routes.tsx)
- ✅ Complete Tea CRUD page (/tea) with:
  - ✅ List view with cards
  - ✅ Create form
  - ✅ Edit form
  - ✅ Delete with confirmation
  - ✅ Client-side data fetching using generated TeasClient
  - ✅ Form rendering using @astroapps/controls
  - ✅ useControl for state management
- ✅ Schema editor page (/editor) using @astroapps/schemas-editor

---

## 🚧 In Progress / Remaining Tasks

### 1. Backend Template Enhancement

#### 1.1 ~~Basic Backend Structure~~ ✅ COMPLETED

#### 1.2 ~~Code Generation Endpoints~~ ✅ COMPLETED

#### 1.3 Database Setup - MOSTLY COMPLETED ⚠️

- ✅ Add EF Core migrations setup
- ✅ Configure database provider (SQL Server)
- [ ] Add seed data configuration
- [ ] Document how to create additional migrations

### 2. CRUD Functionality

#### 2.1 ~~Backend CRUD~~ ✅ COMPLETED
- ✅ Example Tea entity model with full CRUD
- ✅ All CRUD endpoints following best practices
- ✅ DTOs and AppForms properly implemented
- [ ] Create generic CRUD base controller (optional enhancement)
- [ ] Implement repository pattern (optional enhancement)
- [ ] Add pagination to GET /api/teas endpoint

#### 2.2 Frontend CRUD - MOSTLY COMPLETED ⚠️

- ✅ Example CRUD page with list, create, edit, delete
- ✅ Client-side data fetching
- ✅ Form rendering using @react-typed-forms
- [ ] Replace card-based list view with data grid
- [ ] Add error handling and loading states
- [ ] Add form validation display
- [ ] Implement optimistic updates
- [ ] Add toast notifications for success/error

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

#### 5.1 Client-Common Setup - MOSTLY COMPLETED ⚠️

- ✅ NSwag configuration with proper settings
- ✅ TypeScript types generation from Swagger
- ✅ Schema generation endpoint integration
- ✅ Forms generation endpoint integration
- ✅ Editor schemas generation
- [ ] Add retry logic
- [ ] Add request interceptors
- [ ] Add response error handling
- [ ] Add base URL configuration from environment

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

#### 10.3 Developer Experience - PARTIALLY COMPLETED ⚠️

- ✅ Hot reload for backend (via dotnet run/watch)
- ✅ Hot reload for frontend (Next.js dev server)
- ✅ Code formatting (Prettier configured in client-common)
- [ ] Add linting (ESLint)
- [ ] Add git hooks (Husky - optional)
- [ ] Add .gitignore files to template

---

## 🎯 Priority Order

### ~~Phase 1: Core Functionality~~ ✅ MOSTLY COMPLETED

1. ✅ Complete basic backend structure (1.1)
2. ✅ Implement code generation endpoints (1.2)
3. ✅ Add backend CRUD functionality (2.1)
4. ✅ Complete API client generation (5.1)
5. ✅ Add frontend CRUD pages (2.2)

**Remaining Phase 1 Tasks:**
- Fix form editor (currently broken)
- Add error handling and loading states to Tea page
- Add toast notifications
- Update Tea page to use TeaInfo instead of TeaDto
- Add base URL configuration from environment

### Phase 2: Essential Features - IN PROGRESS 🚧

1. Add authentication (3.1, 3.2)
2. Complete UI components (4.1)
3. Add layouts and navigation (4.2)
4. Add data grid (4.3) - Replace card-based list with proper data grid

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

- **Form editor is currently broken** - needs investigation and fix
- Turbopack has Windows path resolution issues - using webpack mode instead
- Peer dependency warnings for some packages (non-critical)
- Tea page uses TeaDto instead of TeaInfo (should be updated)
- No error handling or loading states in Tea CRUD page
- Hard-coded API URL in Tea page (should use environment variable)

### Design Decisions

1. **Rush over Lerna/Yarn workspaces**: Better suited for large monorepos, better caching
2. **Webpack over Turbopack**: Better Windows support and stability
3. **pnpm over npm/yarn**: Faster, more efficient disk usage
4. **Next.js 16**: Latest stable with App Router
5. **@react-typed-forms**: Type-safe forms with schema generation
6. **BEST-PRACTICES.md compliance**: All DTOs follow Edit/Info/View naming pattern, AppForms pattern for forms, exception-based error handling

### Recent Completions (Latest Session)

- Implemented all Tea DTOs following BEST-PRACTICES.md (TeaEdit, TeaInfo, TeaView)
- Created AppForms (TeaEditorForm, TeaSearchForm)
- Updated TeasController to use exception-throwing pattern
- Removed ActionResult wrappers, now using clean return types
- Added proper namespace organization

### Future Considerations

- Consider adding mobile app template (React Native/Expo)
- MSAL authentication integration (following BEST-PRACTICES.md patterns)
- Generic CRUD base controller/service pattern
- Repository pattern implementation

---

## 🔗 Related Documentation

- [Rush Documentation](https://rushjs.io)
- [Next.js Documentation](https://nextjs.org/docs)
- [pnpm Workspaces](https://pnpm.io/workspaces)
- [Astrolabe Common CLAUDE.md](../CLAUDE.md)
- [Astrolabe Common BEST-PRACTICES.md](../BEST-PRACTICES.md)
