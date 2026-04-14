using Astrolabe.FileStorage;

namespace Astrolabe.Forms.EF;

public interface IItemFileService
{
    Task<FormUpload> UploadFile(Guid personId, Guid? itemId, Stream stream, string fileName);
    Task DeleteFile(Guid personId, Guid? itemId, Guid fileId);
    Task<DownloadResponse?> DownloadFile(Guid personId, Guid? itemId, Guid fileId);
}
