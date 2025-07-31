namespace Astrolabe.FileStorage;

public record DownloadResponse(Stream Content, string ContentType);
