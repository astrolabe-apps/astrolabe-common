using Astrolabe.FileStorage;
using Microsoft.EntityFrameworkCore;

namespace Astrolabe.Forms.EF;

public class EfItemFileService : IItemFileService
{
    private readonly DbContext _dbContext;
    private readonly IFileStorage<ItemFile>? _fileStorage;

    public EfItemFileService(DbContext dbContext, IFileStorage<ItemFile>? fileStorage = null)
    {
        _dbContext = dbContext;
        _fileStorage = fileStorage;
    }

    private DbSet<ItemFile> ItemFiles => _dbContext.Set<ItemFile>();

    public async Task<DownloadResponse?> DownloadFile(Guid personId, Guid? itemId, Guid fileId)
    {
        var fileStorage =
            _fileStorage ?? throw new InvalidOperationException("FileStorage not configured");
        var file = await GetFile(personId, itemId, fileId);
        if (file == null)
            return null;
        var download = await fileStorage.DownloadFile(file);
        return download is null ? null : download with { FileName = file.Filename };
    }

    public async Task<FormUpload> UploadFile(
        Guid personId,
        Guid? itemId,
        Stream stream,
        string fileName
    )
    {
        var fileStorage =
            _fileStorage ?? throw new InvalidOperationException("FileStorage not configured");
        var itemFile = await fileStorage.UploadFile(new UploadRequest(stream, fileName));
        itemFile.ItemId = itemId;
        itemFile.PersonId = personId;
        ItemFiles.Add(itemFile);
        await _dbContext.SaveChangesAsync();
        return new FormUpload
        {
            Filename = itemFile.Filename,
            Length = itemFile.Length,
            Id = itemFile.Id,
        };
    }

    public async Task DeleteFile(Guid personId, Guid? itemId, Guid fileId)
    {
        var fileStorage =
            _fileStorage ?? throw new InvalidOperationException("FileStorage not configured");
        var file = await ItemFiles.FirstOrDefaultAsync(x =>
            x.Id == fileId && x.ItemId == itemId && x.PersonId == personId
        );
        if (file != null)
        {
            await fileStorage.DeleteFile(file);
            ItemFiles.Remove(file);
            await _dbContext.SaveChangesAsync();
        }
    }

    public async Task<ItemFile?> GetFile(Guid personId, Guid? itemId, Guid fileId)
    {
        return await ItemFiles.FirstOrDefaultAsync(x =>
            x.Id == fileId && x.ItemId == itemId && x.PersonId == personId
        );
    }
}
