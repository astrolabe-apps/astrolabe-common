---
name: astrolabe-file-storage-azure
description: Azure Blob Storage implementation of IFileStorage interface with organized blob paths and metadata handling. Use when storing files in Azure Blob Storage with Entity Framework integration.
---

# Astrolabe.FileStorage.Azure - Azure Blob Storage Implementation

## Overview

Astrolabe.FileStorage.Azure extends the core file storage abstraction with Azure Blob Storage capabilities, providing cloud-based file storage with the same `IFileStorage<T>` interface.

**When to use**: Use this library when you need to store files in Azure Blob Storage with a clean, generic API that integrates seamlessly with Entity Framework and ASP.NET Core.

**Package**: `Astrolabe.FileStorage.Azure`
**Dependencies**: Astrolabe.FileStorage, Azure.Storage.Blobs
**Target Framework**: .NET 7-8

## Key Concepts

### 1. BlobContainerFileStorage

Main implementation that wraps `BlobContainerClient` with the generic `IFileStorage<T>` interface.

### 2. Flexible Path Generation

Custom functions generate blob paths from upload requests, allowing organized storage structures (e.g., by user, date, or content type).

### 3. Metadata Handling

Transform blob upload results into your domain objects, storing paths and metadata in your database while files live in Azure.

## Common Patterns

### Basic Setup with Entity Framework

```csharp
using Astrolabe.FileStorage.Azure;
using Azure.Storage.Blobs;
using Microsoft.EntityFrameworkCore;

// 1. Define your file entity (database model)
public class FileEntity
{
    public Guid Id { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string BlobPath { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public long Size { get; set; }
    public DateTime UploadedAt { get; set; }
    public Guid UserId { get; set; }
}

// 2. Create file storage service
public class FileService
{
    private readonly AppDbContext _context;
    private readonly IFileStorage<FileEntity> _fileStorage;

    public FileService(AppDbContext context, BlobContainerClient blobContainer)
    {
        _context = context;

        _fileStorage = BlobContainerFileStorage.CreateContainerStorage<FileEntity>(
            containerClient: blobContainer,

            // Generate blob path from upload request
            newUploadPath: request =>
            {
                var timestamp = DateTime.UtcNow.ToString("yyyy/MM/dd");
                var guid = Guid.NewGuid();
                return $"uploads/{timestamp}/{guid}/{request.FileName}";
            },

            // Create domain object from upload result
            newUpload: async uploadInfo =>
            {
                var file = new FileEntity
                {
                    Id = Guid.NewGuid(),
                    FileName = uploadInfo.Request.FileName,
                    BlobPath = uploadInfo.BlobPath,
                    ContentType = uploadInfo.ContentType,
                    Size = uploadInfo.ContentLength,
                    UploadedAt = DateTime.UtcNow
                };

                _context.Files.Add(file);
                await _context.SaveChangesAsync();

                return file;
            },

            // Extract blob path from domain object
            getPath: file => file.BlobPath,

            // Configure options
            options: new FileStorageOptions
            {
                MaxLength = 50 * 1024 * 1024 // 50MB limit
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

### Dependency Injection Setup

```csharp
using Azure.Storage.Blobs;
using Astrolabe.FileStorage;
using Astrolabe.FileStorage.Azure;

var builder = WebApplication.CreateBuilder(args);

// Register BlobServiceClient
var blobConnectionString = builder.Configuration["Azure:Storage:ConnectionString"];
builder.Services.AddSingleton(new BlobServiceClient(blobConnectionString));

// Register BlobContainerClient
builder.Services.AddSingleton(sp =>
{
    var blobServiceClient = sp.GetRequiredService<BlobServiceClient>();
    var containerName = builder.Configuration["Azure:Storage:ContainerName"] ?? "files";
    return blobServiceClient.GetBlobContainerClient(containerName);
});

// Register FileStorage
builder.Services.AddScoped<IFileStorage<FileEntity>>(sp =>
{
    var context = sp.GetRequiredService<AppDbContext>();
    var blobContainer = sp.GetRequiredService<BlobContainerClient>();

    return BlobContainerFileStorage.CreateContainerStorage<FileEntity>(
        containerClient: blobContainer,
        newUploadPath: request => $"uploads/{Guid.NewGuid()}/{request.FileName}",
        newUpload: async uploadInfo =>
        {
            var file = new FileEntity
            {
                Id = Guid.NewGuid(),
                FileName = uploadInfo.Request.FileName,
                BlobPath = uploadInfo.BlobPath,
                ContentType = uploadInfo.ContentType,
                Size = uploadInfo.ContentLength,
                UploadedAt = DateTime.UtcNow
            };
            context.Files.Add(file);
            await context.SaveChangesAsync();
            return file;
        },
        getPath: file => file.BlobPath,
        options: new FileStorageOptions { MaxLength = 50 * 1024 * 1024 }
    );
});

var app = builder.Build();
app.Run();
```

### Using Managed Identity Instead of Connection String

```csharp
using Azure.Identity;
using Azure.Storage.Blobs;

// For production: use managed identity
builder.Services.AddSingleton(sp =>
{
    var accountName = builder.Configuration["Azure:Storage:AccountName"];
    var containerName = builder.Configuration["Azure:Storage:ContainerName"] ?? "files";

    var blobUri = new Uri($"https://{accountName}.blob.core.windows.net/{containerName}");

    // Use DefaultAzureCredential for automatic auth (managed identity, Azure CLI, etc.)
    return new BlobContainerClient(blobUri, new DefaultAzureCredential());
});
```

### Organized Blob Path Structures

```csharp
using Astrolabe.FileStorage.Azure;

// Organize by date
newUploadPath: request =>
{
    var date = DateTime.UtcNow;
    return $"uploads/{date:yyyy}/{date:MM}/{date:dd}/{Guid.NewGuid()}/{request.FileName}";
}

// Organize by user and content type
newUploadPath: request =>
{
    var userId = GetCurrentUserId(); // Your method to get user
    var contentType = request.ContentType?.Split('/').FirstOrDefault() ?? "unknown";
    return $"users/{userId}/{contentType}/{Guid.NewGuid()}/{request.FileName}";
}

// Organize by bucket (multi-tenant)
newUploadPath: request =>
{
    var bucket = request.Bucket ?? "default";
    return $"{bucket}/files/{Guid.NewGuid()}/{request.FileName}";
}
```

## Best Practices

### 1. Use Managed Identity in Production

```csharp
// ✅ DO - Use managed identity for production
new BlobContainerClient(blobUri, new DefaultAzureCredential());

// ⚠️ CAUTION - Connection strings are okay for development
new BlobContainerClient(connectionString, containerName);

// ❌ DON'T - Hardcode connection strings
new BlobContainerClient("DefaultEndpointsProtocol=https;...", "files");
```

### 2. Use Structured Blob Paths

```csharp
// ✅ DO - Use organized, hierarchical paths
$"uploads/{year}/{month}/{day}/{guid}/{filename}"
$"users/{userId}/documents/{guid}/{filename}"

// ❌ DON'T - Use flat structure with millions of files
$"{guid}-{filename}"
```

### 3. Handle Upload Failures

```csharp
// ✅ DO - Handle partial failures
newUpload: async uploadInfo =>
{
    try
    {
        var file = new FileEntity { /* ... */ };
        _context.Files.Add(file);
        await _context.SaveChangesAsync();
        return file;
    }
    catch (Exception)
    {
        // Blob was uploaded but DB save failed
        // Delete the blob to maintain consistency
        var blobClient = containerClient.GetBlobClient(uploadInfo.BlobPath);
        await blobClient.DeleteIfExistsAsync();
        throw;
    }
}
```

## Troubleshooting

### Common Issues

**Issue: "Container not found" error**
- **Cause**: Blob container doesn't exist in storage account
- **Solution**: Create container manually or use:
  ```csharp
  await blobContainer.CreateIfNotExistsAsync(PublicAccessType.None);
  ```

**Issue: "Authentication failed" error**
- **Cause**: Invalid credentials or permissions
- **Solution**: Verify connection string or managed identity has "Storage Blob Data Contributor" role

**Issue: Files uploaded but database not updated**
- **Cause**: Exception in `newUpload` callback after blob upload
- **Solution**: Wrap database operations in try-catch and delete blob on failure

## Configuration

### appsettings.json

```json
{
  "Azure": {
    "Storage": {
      "ConnectionString": "DefaultEndpointsProtocol=https;AccountName=...",
      "AccountName": "mystorageaccount",
      "ContainerName": "files"
    }
  }
}
```

## Project Structure Location

- **Path**: `Astrolabe.FileStorage.Azure/`
- **Project File**: `Astrolabe.FileStorage.Azure.csproj`
- **Namespace**: `Astrolabe.FileStorage.Azure`
