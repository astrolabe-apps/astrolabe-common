# **SolutionName**

**Description**

## Prerequisites

- .NET 8 SDK
- Node.js 22+ and npm
- SQL Server (or update connection string in appsettings.Development.json)

## Getting Started

### Backend

```bash
cd __ProjectName__
dotnet restore
dotnet run
```

The backend will start on `https://localhost:__HttpsPort__`

### Frontend

```bash
cd __ProjectName__/ClientApp/sites/__SiteName__
rushx dev
```

The frontend will start on `http://localhost:__SpaPort__`

## Project Structure

```
__SolutionName__/
├── __ProjectName__/           # Backend ASP.NET Core project
│   ├── Controllers/
│   ├── Data/
│   ├── Forms/
│   ├── Services/
│   └── ClientApp/            # Frontend Rush monorepo
│       ├── sites/__SiteName__/
│       ├── astrolabe-ui/    # Shared UI components and styles
│       └── client-common/   # NSwag, form definitions, shared frontend components and utilities
```
