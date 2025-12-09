---
name: astrolabe-file-storage
description: Generic file storage abstractions for .NET with IFileStorage interface supporting uploads, downloads, and deletions. Use when handling file operations with database or any storage backend.
---

# Astrolabe.FileStorage - File Storage Abstraction

## Overview

Astrolabe.FileStorage provides generic file storage abstractions for implementing flexible file handling in .NET applications. It allows building file storage capabilities with minimal code through generic interfaces and built-in implementations.

**When to use**: Use this library when you need to handle file uploads, downloads, and deletions with a consistent API that works with any backend (database, cloud storage, filesystem).

**Package**: `Astrolabe.FileStorage`
**Dependencies**: Astrolabe.Common, ASP.NET Core
**Extensions**: Astrolabe.FileStorage.Azure (for Azure Blob Storage)
**Target Framework**: .NET 7-8

## Key Concepts

### 1. IFileStorage<T> Interface

Generic interface providing standard file operations where `T` is your file reference type (e.g., `FileEntity`, `Guid`, `string`).

**Operations**:
- `UploadFile`: Store files and return a reference of type `T`
- `DownloadFile`: Retrieve files using their reference
- `DeleteFile`: Remove files from storage

### 2. Request/Response Models

- **`UploadRequest`**: Contains file stream, filename, bucket, and content type
- **`DownloadResponse`**: Contains file stream, content type, and filename
- **`ByteArrayResponse`**: Represents file data as byte array with metadata

### 3. ByteArrayFileStorage

In-memory/database-friendly implementation that works with byte arrays. Perfect for storing files in SQL databases.

## Common Patterns

### Database Storage with Entity Framework

```csharp
using Astrolabe.FileStorage;
using Microsoft.EntityFrameworkCore;

// 1. Define your file entity
public class FileEntity
{
    public Guid Id { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public byte[] Content { get; set; } = Array.Empty<byte>();
    public long Size { get; set; }
    public DateTime UploadedAt { get; set; }
    public Guid UserId { get; set; }
}

// 2. Create file storage instance
public class FileService
{
    private readonly AppDbContext _context;
    private readonly IFileStorage<FileEntity> _fileStorage;

    public FileService(AppDbContext context)
    {
        _context = context;

        _fileStorage = ByteArrayFileStorage.Create<FileEntity>(
            // Create: Receives byte array and request, returns file entity
            create: async (content, request) =>
            {
                var file = new FileEntity
                {
                    Id = Guid.NewGuid(),
                    FileName = request.FileName,
                    ContentType = request.ContentType ?? "application/octet-stream",
                    Content = content,
                    Size = content.Length,
                    UploadedAt = DateTime.UtcNow
                };

                _context.Files.Add(file);
                await _context.SaveChangesAsync();
                return file;
            },

            // Get bytes: Retrieve file data as ByteArrayResponse
            getBytes: async (fileEntity) =>
            {
                var file = await _context.Files.FindAsync(fileEntity.Id);
                if (file == null)
                    throw new NotFoundException($"File {fileEntity.Id} not found");

                return new ByteArrayResponse(
                    Content: file.Content,
                    ContentType: file.ContentType,
                    FileName: file.FileName
                );
            },

            // Options: Configure max file size
            options: new FileStorageOptions
            {
                MaxLength = 10 * 1024 * 1024 // 10MB limit
            },

            // Delete: Remove from database (optional)
            deleteFile: async (fileEntity) =>
            {
                var file = await _context.Files.FindAsync(fileEntity.Id);
                if (file != null)
                {
                    _context.Files.Remove(file);
                    await _context.SaveChangesAsync();
                }
            }
        );
    }

    public Task<FileEntity> UploadFile(UploadRequest request) =>
        _fileStorage.UploadFile(request);

    public Task<DownloadResponse?> DownloadFile(FileEntity file) =>
        _fileStorage.DownloadFile(file);

    public Task DeleteFile(FileEntity file) =>
        _fileStorage.DeleteFile(file);
}
```

### ASP.NET Core Controller Integration

```csharp
using Astrolabe.FileStorage;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/files")]
public class FilesController : ControllerBase
{
    private readonly IFileStorage<FileEntity> _fileStorage;
    private readonly AppDbContext _context;

    public FilesController(IFileStorage<FileEntity> fileStorage, AppDbContext context)
    {
        _fileStorage = fileStorage;
        _context = context;
    }

    [HttpPost("upload")]
    public async Task<IActionResult> Upload(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest("No file uploaded");

        var request = new UploadRequest(
            content: file.OpenReadStream(),
            fileName: file.FileName,
            contentType: file.ContentType
        );

        try
        {
            var fileEntity = await _fileStorage.UploadFile(request);
            return Ok(new
            {
                fileEntity.Id,
                fileEntity.FileName,
                fileEntity.Size,
                fileEntity.UploadedAt
            });
        }
        catch (FileStorageException ex) when (ex.ErrorCode == FileStorageErrorCode.TooLarge)
        {
            return BadRequest("File is too large. Maximum size is 10MB.");
        }
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> Download(Guid id)
    {
        var fileEntity = await _context.Files.FindAsync(id);
        if (fileEntity == null)
            return NotFound();

        var download = await _fileStorage.DownloadFile(fileEntity);
        if (download == null)
            return NotFound();

        return File(download.Content, download.ContentType, download.FileName);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var fileEntity = await _context.Files.FindAsync(id);
        if (fileEntity == null)
            return NotFound();

        await _fileStorage.DeleteFile(fileEntity);
        return NoContent();
    }
}
```

## Best Practices

### 1. Always Set Maximum File Size

```csharp
// ✅ DO - Set reasonable limits based on your use case
new FileStorageOptions { MaxLength = 10 * 1024 * 1024 } // 10MB

// ❌ DON'T - Use unlimited size or excessively large limits
new FileStorageOptions { MaxLength = int.MaxValue } // Dangerous!
```

### 2. Validate File Types

```csharp
// ✅ DO - Validate both content type and extension
var allowedTypes = new[] { "image/jpeg", "image/png" };
var allowedExtensions = new[] { ".jpg", ".jpeg", ".png" };

if (!allowedTypes.Contains(file.ContentType) ||
    !allowedExtensions.Contains(Path.GetExtension(file.FileName).ToLower()))
{
    throw new FileStorageException(FileStorageErrorCode.IllegalFileType, "Invalid file type");
}
```

## Troubleshooting

### Common Issues

**Issue: FileStorageException "File too large"**
- **Cause**: File exceeds configured `MaxLength`
- **Solution**: Either increase `MaxLength` in options or inform user of size limit

**Issue: Out of memory when uploading large files**
- **Cause**: Entire file loaded into memory at once
- **Solution**: Use streaming approach or implement chunked uploads for very large files

**Issue: Content type is always "application/octet-stream"**
- **Cause**: Content type not provided in request or file extension not recognized
- **Solution**: Provide content type explicitly or configure custom `ContentTypeProvider`

## Project Structure Location

- **Path**: `Astrolabe.FileStorage/`
- **Project File**: `Astrolabe.FileStorage.csproj`
- **Namespace**: `Astrolabe.FileStorage`
