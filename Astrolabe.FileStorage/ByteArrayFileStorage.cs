namespace Astrolabe.FileStorage;

public static class ByteArrayFileStorage
{
    public static IFileStorage<T> Create<T>(Func<byte[], UploadRequest, T> Create, Func<T, Task<(byte[] Content, string ContentType)>> GetBytes)
    {
        return new ByteArrayFileStorage<T>(Create, GetBytes);
    }
}

public record ByteArrayFileStorage<T>(Func<byte[], UploadRequest, T> Create, Func<T, Task<(byte[] Content, string ContentType)>> GetBytes) : IFileStorage<T>
{
    public async Task<T> UploadFile(UploadRequest request)
    {
        var memoryStream = new MemoryStream();
        await request.Content.CopyToAsync(memoryStream);
        return Create(memoryStream.GetBuffer(), request);
    }

    public async Task<DownloadResponse?> DownloadFile(T key)
    {
        var (bytes, ct) = await GetBytes(key);
        return new DownloadResponse(new MemoryStream(bytes), ct);
    }
} 
