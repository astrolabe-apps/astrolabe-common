using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;

namespace Astrolabe.FileStorage.Azure;

public static class BlobContainerFileStorage
{
    public static IFileStorage<T> CreateContainerStorage<T>(
        BlobContainerClient containerClient,
        Func<UploadRequest, string> newUploadPath,
        Func<BlobUploadInfo, Task<T>> newUpload,
        Func<T, string> getPath,
        FileStorageOptions? options = null
    )
    {
        return new BlobContainerFileStorage<T>(
            containerClient,
            options ?? new FileStorageOptions(),
            newUploadPath,
            newUpload,
            getPath
        );
    }
}

public class BlobContainerFileStorage<T>(
    BlobContainerClient containerClient,
    FileStorageOptions options,
    Func<UploadRequest, string> newUploadPath,
    Func<BlobUploadInfo, Task<T>> newUpload,
    Func<T, string> getPath
) : IFileStorage<T>
{
    public async Task<DownloadResponse?> DownloadFile(T file)
    {
        var path = getPath(file);
        var blobClient = containerClient.GetBlobClient(path);
        var download = await blobClient.DownloadAsync();
        return download is { Value: var d }
            ? new DownloadResponse(d.Content, d.ContentType, null)
            : null;
    }

    public Task DeleteFile(T file)
    {
        var path = getPath(file);
        var blobClient = containerClient.GetBlobClient(path);
        return blobClient.DeleteIfExistsAsync();
    }

    public async Task<T> UploadFile(UploadRequest request)
    {
        var contentType = options.GetContentTypeForFilename(request.ContentType, request.FileName);
        var path = newUploadPath(request);
        var blobHttpHeader = new BlobHttpHeaders { ContentType = contentType };

        var blobClient = containerClient.GetBlobClient(path);

        await using var limitedStream = new LimitedStream(request.Content, options.MaxLength);
        var binaryData = await BinaryData.FromStreamAsync(limitedStream);
        var result = await blobClient.UploadAsync(
            binaryData,
            new BlobUploadOptions { HttpHeaders = blobHttpHeader }
        );

        if (!result.HasValue)
            throw new Exception("Failed to upload blob: " + path);
        return await newUpload(
            new BlobUploadInfo(result.Value, request, limitedStream.BytesRead, path, contentType)
        );
    }
}

public record BlobUploadInfo(
    BlobContentInfo ContentInfo,
    UploadRequest Request,
    long ContentLength,
    string BlobPath,
    string ContentType
);
