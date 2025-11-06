# __SiteName__

Next.js frontend application for __AppName__.

## Getting Started

### Prerequisites

- Node.js 22+ and pnpm
- Rush (installed globally or use `rushx` from parent directory)

### Environment Configuration

Create a `.env.local` file in this directory with the following variables:

```bash
# API Configuration
NEXT_PUBLIC_API_URL=https://localhost:__HttpsPort__
```

For production deployments, set these environment variables in your hosting platform.

### Development

From the repository root:

```bash
# Install dependencies
rush update

# Start development server
cd sites/__SiteName__
rushx dev
```

The application will be available at `http://localhost:__SpaPort__`, **but proxies to the backend via `http://localhost:__HttpsPort__`**. Don't use the SpaPort. Nothing will work.

### Building for Production

```bash
# Build all packages
rush build

# Or build just this site
rush build --to @__AppName__/__SiteName__
```

### Available Scripts

- `rushx dev` - Start Next.js development server
- `rushx build` - Build production bundle
- `rushx start` - Start production server
- `rushx lint` - Run ESLint

## Project Structure

```
src/
├── app/                 # Next.js App Router pages
│   ├── layout.tsx      # Root layout
│   ├── page.tsx        # Home page
│   ├── tea/            # Tea management page
│   └── editor/         # Form editor page
├── config.ts           # Application configuration
├── renderers.ts        # Form renderers
└── routes.tsx          # Route configuration
```

## API Integration

This application connects to the __AppName__ backend API. The API client is automatically generated from the OpenAPI specification using NSwag.

To regenerate the API client after backend changes:

```bash
cd ../../client-common
rushx gencode
```

## Environment Variables

### Required

- `NEXT_PUBLIC_API_URL` - Base URL for the backend API

### Optional

Add additional environment variables as needed for your application.

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Rush Documentation](https://rushjs.io)
- [Astrolabe Common](../../README.md)
