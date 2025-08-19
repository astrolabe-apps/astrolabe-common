# Astrolabe.FileStorage

[![NuGet](https://img.shields.io/nuget/v/Astrolabe.FileStorage.svg)](https://www.nuget.org/packages/Astrolabe.FileStorage/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A C# library providing generic file storage abstractions for implementing flexible file handling in .NET applications. Part of the Astrolabe Apps library stack.

## Overview

Astrolabe.FileStorage provides a set of generic interfaces and implementations to simplify file storage operations in your applications. It allows you to build flexible file handling capabilities with minimal code by providing:

- Generic file storage abstractions
- Byte array-based storage implementation
- File size limiting and validation
- Content type detection and handling
- Upload, download, and delete operations
- Configurable storage options

## Installation

```bash
dotnet add package Astrolabe.FileStorage
```

## Core Features

### File Storage Interface

The `IFileStorage<T>` interface provides a standard contract for file storage operations:

- **UploadFile**: Store files with metadata and return a key of type `T`
- **DownloadFile**: Retrieve files using their key
- **DeleteFile**: Remove files from storage

### Upload and Download Models

- **UploadRequest**: Encapsulates file content, filename, bucket, and content type
- **DownloadResponse**: Contains file stream, content type, and filename
- **ByteArrayResponse**: Represents file data as byte array with metadata

### File Storage Options

The `FileStorageOptions` class provides configuration:

- **MaxLength**: Maximum file size (default: 2MB)
- **ContentTypeProvider**: Custom content type detection

### Built-in Implementations

- **ByteArrayFileStorage**: In-memory byte array-based storage
- **LimitedStream**: Stream wrapper that enforces size limits

## Usage

The library provides a simple and flexible API for file storage operations. The main entry point is the `IFileStorage<T>` interface which allows you to implement file storage using any backend while maintaining a consistent API.

### Basic Implementation

Use the `ByteArrayFileStorage.Create<T>()` factory method to create file storage instances. You provide functions for creating, retrieving, and optionally deleting files, along with configuration options.

### Database Integration

The library works well with Entity Framework and other ORMs. Store file content as byte arrays in your database entities and use the ByteArrayFileStorage implementation to handle the file operations.

### Custom Content Types

Configure custom content type providers to handle special file formats or override default MIME type detection behavior.

### ASP.NET Core Integration

The library integrates seamlessly with ASP.NET Core applications. Handle file uploads using IFormFile and return download responses using the built-in File() action result.

## Performance Considerations

- **Stream Management**: Always dispose of streams properly, especially when working with large files
- **Memory Usage**: Be mindful of memory usage with ByteArrayFileStorage for large files
- **Async Operations**: All operations are async to prevent blocking
- **File Size Limits**: Use LimitedStream or configure MaxLength to prevent excessive resource usage

## Error Codes

The library defines specific error codes through `FileStorageErrorCode`:

- **TooLarge**: File exceeds the configured maximum size
- **IllegalFileType**: File type is not allowed (for future extensibility)

## License

MIT

## Links

- [GitHub Repository](https://github.com/astrolabe-apps/astrolabe-common)
- [NuGet Package](https://www.nuget.org/packages/Astrolabe.FileStorage)
- [Documentation](https://github.com/astrolabe-apps/astrolabe-common/tree/main/Astrolabe.FileStorage)