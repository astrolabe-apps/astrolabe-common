using Microsoft.AspNetCore.StaticFiles;

namespace Astrolabe.FileStorage;

public class FileStorageOptions
{
    public IContentTypeProvider? ContentTypeProvider { get; set; }

    public int MaxLength { get; set; } = 1024 * 1024 * 2;
}

public static class FileStorageOptionsExtensions
{
    private static readonly FileExtensionContentTypeProvider DefaultContentTypeProvider = new();

    public static string GetContentTypeForFilename(
        this FileStorageOptions options,
        string? contentType,
        string? filename
    )
    {
        return contentType
            ?? (
                filename != null
                && (options.ContentTypeProvider ?? DefaultContentTypeProvider).TryGetContentType(
                    filename,
                    out var lookupCt
                )
                    ? lookupCt
                    : "application/octet-stream"
            );
    }
}
