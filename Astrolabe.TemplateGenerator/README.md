# Astrolabe Template Generator

A .NET CLI tool for scaffolding new Astrolabe projects with a C# backend and Next.js frontend. Automatically configures and installs the custom Astrolabe stack of packages.

## Installation

Install as a global .NET tool:

```bash
dotnet pack Astrolabe.TemplateGenerator/Astrolabe.TemplateGenerator.csproj

dotnet tool install --global --add-source ./Astrolabe.TemplateGenerator/nupkg Astrolabe.TemplateGenerator
# dotnet tool install --global Astrolabe.TemplateGenerator # this will be available once published
```

## Usage

Run the template generator:

```bash
dotnet astrotemplate
```

The tool will interactively prompt you for:

- **Solution Name**: The name of your solution
- **Project Name**: The name of your project
- **Description**: A brief description of your project
- **Site Name**: The name of your website
- **HTTP Port**: The HTTP port for the backend (default: 5000)
- **HTTPS Port**: The HTTPS port for the backend (default: 5001)
- **SPA Port**: The port for the Next.js frontend (default: 3000)
- **Connection String**: Database connection string

And whether you want the barebones template, or a demo project with a sample Tea entity and full CRUD operations.

## What Gets Generated

The template generator creates a full-stack application with:

### Backend (C#/.NET)

- ASP.NET Core Web API
- Entity Framework Core with SQL Server
- Astrolabe packages:
  - `Astrolabe.Schemas` - Form and schema definitions
  - `Astrolabe.Controls` - Reactive form controls
  - `Astrolabe.SearchState` - Search and filtering
  - `Astrolabe.Validation` - Validation rules
  - And more...

### Frontend (Next.js/TypeScript)

- Next.js 15
- TypeScript
- Astrolabe client packages:
  - `@react-typed-forms/schemas` - Form rendering
  - `@react-typed-forms/schemas-html` - HTML components
  - `@react-typed-forms/core` - Form state management
  - And more...
- Tailwind CSS
- Rush monorepo structure

### Example Entity

- A sample "Tea" entity with full CRUD operations
- Search and filtering functionality
- Form definitions and validation
- Controller and service layer

## Project Structure

```
YourSolution/
├── YourProject/                    # Backend (.NET)
│   ├── Controllers/
│   ├── Services/
│   ├── Models/
│   ├── Data/
│   ├── Forms/
│   └── Migrations/
└── ClientApp/                      # Frontend
    └── sites/
        └── your-site/              # Next.js app
            ├── app/
            ├── components/
            └── package.json
```

## After Generation

1. **Build the backend:**

   ```bash
   cd YourSolution/YourProject
   dotnet build
   ```

2. **Run migrations:**

   ```bash
   dotnet ef database update
   ```

3. **Install frontend dependencies:**

   ```bash
   cd ClientApp
   rush update
   ```

4. **Run the application:**
   - Backend: `dotnet run` (in YourProject directory)
   - Frontend: `rush serve:your-site` (in ClientApp directory)

## Requirements

- .NET 8.0 SDK or later
- Node.js 22+ and npm/pnpm
- SQL Server (or modify connection string for other databases)

## License

MIT

## Repository

[https://github.com/astrolabe-apps/astrolabe-common](https://github.com/astrolabe-apps/astrolabe-common)
