namespace Astrolabe.FileStorage;

public static class ByteArrayFileStorage
{
    public static IFileStorage<T> Create<T>(
        Func<byte[], UploadRequest, Task<T>> create,
        Func<T, Task<ByteArrayResponse>> getBytes,
        FileStorageOptions? options = null,
        Func<T, Task>? deleteFile = null
    )
    {
        return new ByteArrayFileStorage<T>(
            create,
            getBytes,
            options ?? new FileStorageOptions(),
            deleteFile
        );
    }
}

public class ByteArrayFileStorage<T>(
    Func<byte[], UploadRequest, Task<T>> create,
    Func<T, Task<ByteArrayResponse>> getBytes,
    FileStorageOptions options,
    Func<T, Task>? deleteFile
) : IFileStorage<T>
{
    public async Task<T> UploadFile(UploadRequest request)
    {
        var memoryStream = new MemoryStream();
        await using var reqStream = new LimitedStream(request.Content, options.MaxLength);
        await reqStream.CopyToAsync(memoryStream);
        return await create(memoryStream.GetBuffer(), request);
    }

    public async Task<DownloadResponse?> DownloadFile(T key)
    {
        var byteResponse = await getBytes(key);
        var contentType = options.GetContentTypeForFilename(
            byteResponse.ContentType,
            byteResponse.FileName
        );
        return new DownloadResponse(
            new MemoryStream(byteResponse.Content),
            contentType,
            byteResponse.FileName
        );
    }

    public Task DeleteFile(T file)
    {
        return deleteFile?.Invoke(file) ?? Task.CompletedTask;
    }
}

public record ByteArrayResponse(byte[] Content, string? ContentType, string? FileName);
