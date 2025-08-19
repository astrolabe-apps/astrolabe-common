namespace Astrolabe.FileStorage;

public interface IFileStorage<T>
{
    Task<T> UploadFile(UploadRequest request);

    Task<DownloadResponse?> DownloadFile(T file);

    Task DeleteFile(T file);
}
