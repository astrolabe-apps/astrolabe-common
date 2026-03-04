using Astrolabe.FileStorage;
using Microsoft.EntityFrameworkCore;

namespace Astrolabe.Forms;

public partial class FormsContext<
    TItem, TFormData, TPerson, TFormDef, TTableDef,
    TAuditEvent, TItemTag, TItemNote, TItemFile, TExportDef>
{
    protected virtual IFileStorage<TItemFile>? FileStorage => null;

    public async Task<FormUpload> UploadFile(Guid personId, Guid? itemId, Stream stream, string fileName)
    {
        var fileStorage = FileStorage ?? throw new InvalidOperationException("FileStorage not configured");
        var itemFile = await fileStorage.UploadFile(new UploadRequest(stream, fileName));
        itemFile.ItemId = itemId;
        itemFile.PersonId = personId;
        ItemFiles.Add(itemFile);
        await SaveChanges();
        return new FormUpload
        {
            Filename = itemFile.Filename,
            Length = itemFile.Length,
            Id = itemFile.Id,
        };
    }

    public async Task DeleteFile(Guid personId, Guid? itemId, Guid fileId)
    {
        var fileStorage = FileStorage ?? throw new InvalidOperationException("FileStorage not configured");
        var file = await ItemFiles.FirstOrDefaultAsync(x =>
            x.Id == fileId && x.ItemId == itemId && x.PersonId == personId);
        if (file != null)
        {
            await fileStorage.DeleteFile(file);
            ItemFiles.Remove(file);
            await SaveChanges();
        }
    }

    public async Task<TItemFile?> GetFile(Guid personId, Guid? itemId, Guid fileId)
    {
        return await ItemFiles.FirstOrDefaultAsync(x =>
            x.Id == fileId && x.ItemId == itemId && x.PersonId == personId);
    }
}
