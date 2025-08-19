namespace Astrolabe.FileStorage;

public class FileStorageException(FileStorageErrorCode errorCode, string message)
    : Exception(message)
{
    public FileStorageErrorCode ErrorCode { get; } = errorCode;
}

public enum FileStorageErrorCode
{
    TooLarge,
    IllegalFileType,
}
