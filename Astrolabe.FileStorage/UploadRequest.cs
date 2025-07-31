namespace Astrolabe.FileStorage;

public record UploadRequest(Stream Content, string ContentType, string Filename, string Id, string? Bucket = null);