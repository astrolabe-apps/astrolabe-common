namespace Astrolabe.FileStorage;

public record UploadRequest(Stream Content, string FileName, string? Bucket = null, string? ContentType = null);