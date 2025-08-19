# Astrolabe.FileStorage.Azure

[![NuGet](https://img.shields.io/nuget/v/Astrolabe.FileStorage.Azure.svg)](https://www.nuget.org/packages/Astrolabe.FileStorage.Azure/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A C# library providing Azure Blob Storage implementation for the Astrolabe.FileStorage abstraction. Part of the Astrolabe Apps library stack.

## Overview

Astrolabe.FileStorage.Azure extends the core file storage abstraction with Azure Blob Storage capabilities, providing:

- Azure Blob Container integration
- File upload, download, and delete operations using Azure Storage
- Configurable blob paths and metadata handling
- Content type detection and HTTP headers
- File size limiting and validation
- Seamless integration with existing Astrolabe.FileStorage patterns

## Installation

```bash
dotnet add package Astrolabe.FileStorage.Azure
```

This package depends on `Astrolabe.FileStorage` which will be installed automatically.

## Core Features

### BlobContainerFileStorage

The main implementation provides Azure Blob Storage capabilities:

- **Generic Type Support**: Work with any entity type `T` as your file reference
- **Flexible Path Generation**: Custom functions for generating blob paths
- **Metadata Handling**: Transform blob upload results into your domain objects
- **HTTP Headers**: Automatic content type detection and header configuration
- **Size Limits**: Built-in file size validation using `LimitedStream`

### Factory Method

Use the `BlobContainerFileStorage.CreateContainerStorage<T>()` factory method to create storage instances with:

- `BlobContainerClient`: Azure Storage container client
- `newUploadPath`: Function to generate blob paths from upload requests
- `newUpload`: Function to create your domain object from blob upload results
- `getPath`: Function to extract blob path from your domain object
- `options`: Optional file storage configuration

## Usage

### Basic Setup

```csharp
using Azure.Storage.Blobs;
using Astrolabe.FileStorage.Azure;

// Create blob container client
var containerClient = new BlobContainerClient(connectionString, containerName);

// Create file storage instance
var fileStorage = BlobContainerFileStorage.CreateContainerStorage<FileEntity>(
    containerClient: containerClient,
    newUploadPath: request => $"uploads/{Guid.NewGuid()}/{request.FileName}",
    newUpload: async uploadInfo => 
    {
        // Create your domain object from the upload result
        return new FileEntity
        {
            Id = Guid.NewGuid(),
            FileName = uploadInfo.Request.FileName,
            BlobPath = uploadInfo.BlobPath,
            ContentType = uploadInfo.ContentType,
            Size = uploadInfo.ContentLength,
            UploadedAt = DateTime.UtcNow
        };
    },
    getPath: file => file.BlobPath,
    options: new FileStorageOptions { MaxLength = 5 * 1024 * 1024 } // 5MB limit
);
```

### Upload Files

```csharp
// Upload a file
var uploadRequest = new UploadRequest(
    content: fileStream,
    fileName: "document.pdf",
    contentType: "application/pdf"
);

var fileEntity = await fileStorage.UploadFile(uploadRequest);
```

### Download Files

```csharp
// Download a file
var downloadResponse = await fileStorage.DownloadFile(fileEntity);
if (downloadResponse != null)
{
    // Use the stream, content type, and filename
    using var stream = downloadResponse.Content;
    var contentType = downloadResponse.ContentType;
    var fileName = downloadResponse.FileName;
}
```

### Delete Files

```csharp
// Delete a file
await fileStorage.DeleteFile(fileEntity);
```

### Database Integration Example

```csharp
public class FileEntity
{
    public Guid Id { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string BlobPath { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public long Size { get; set; }
    public DateTime UploadedAt { get; set; }
}

public class FileService
{
    private readonly IFileStorage<FileEntity> _fileStorage;
    private readonly DbContext _context;

    public FileService(IFileStorage<FileEntity> fileStorage, DbContext context)
    {
        _fileStorage = fileStorage;
        _context = context;
    }

    public async Task<FileEntity> SaveFileAsync(UploadRequest request)
    {
        var fileEntity = await _fileStorage.UploadFile(request);
        _context.Files.Add(fileEntity);
        await _context.SaveChangesAsync();
        return fileEntity;
    }
}
```

### ASP.NET Core Integration

```csharp
[ApiController]
[Route("api/[controller]")]
public class FilesController : ControllerBase
{
    private readonly IFileStorage<FileEntity> _fileStorage;

    public FilesController(IFileStorage<FileEntity> fileStorage)
    {
        _fileStorage = fileStorage;
    }

    [HttpPost("upload")]
    public async Task<IActionResult> Upload(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest("No file uploaded");

        var request = new UploadRequest(
            file.OpenReadStream(),
            file.FileName,
            contentType: file.ContentType
        );

        var fileEntity = await _fileStorage.UploadFile(request);
        return Ok(fileEntity);
    }

    [HttpGet("{id}/download")]
    public async Task<IActionResult> Download(Guid id)
    {
        var fileEntity = await GetFileEntityById(id); // Your method to get entity
        if (fileEntity == null)
            return NotFound();

        var download = await _fileStorage.DownloadFile(fileEntity);
        if (download == null)
            return NotFound();

        return File(download.Content, download.ContentType, download.FileName);
    }
}
```

## Configuration

### File Storage Options

Configure file handling behavior:

```csharp
var options = new FileStorageOptions
{
    MaxLength = 10 * 1024 * 1024, // 10MB limit
    ContentTypeProvider = new CustomContentTypeProvider()
};
```

### Azure Storage Configuration

```csharp
// Using connection string
var containerClient = new BlobContainerClient(connectionString, containerName);

// Using managed identity
var containerClient = new BlobContainerClient(
    new Uri($"https://{accountName}.blob.core.windows.net/{containerName}"),
    new DefaultAzureCredential()
);
```

## BlobUploadInfo

The `BlobUploadInfo` record provides detailed information about uploaded blobs:

- **ContentInfo**: Azure Storage upload result information
- **Request**: The original upload request
- **ContentLength**: Actual bytes uploaded
- **BlobPath**: The generated blob path
- **ContentType**: Final content type used

## Performance Considerations

- **Stream Management**: Streams are properly managed and disposed
- **Memory Efficiency**: Uses streaming for large files
- **Async Operations**: All operations are fully asynchronous
- **Size Limits**: `LimitedStream` prevents excessive memory usage
- **Connection Pooling**: Reuse `BlobContainerClient` instances

## Error Handling

The library integrates with the base file storage error handling:

- **FileStorageException**: Thrown for file size violations
- **Azure Storage Exceptions**: Native Azure SDK exceptions are preserved
- **Upload Failures**: Throws exceptions with detailed error information

## License

MIT

## Links

- [GitHub Repository](https://github.com/astrolabe-apps/astrolabe-common)
- [NuGet Package](https://www.nuget.org/packages/Astrolabe.FileStorage.Azure)
- [Azure Blob Storage Documentation](https://docs.microsoft.com/en-us/azure/storage/blobs/)
- [Astrolabe.FileStorage](https://www.nuget.org/packages/Astrolabe.FileStorage)