namespace Astrolabe.FileStorage;

public class LimitedStream : Stream
{
    private readonly Stream _baseStream;
    private readonly long _maxBytes;

    public LimitedStream(Stream baseStream, long maxBytes)
    {
        _baseStream = baseStream ?? throw new ArgumentNullException(nameof(baseStream));
        _maxBytes = maxBytes;
        BytesRead = 0;

        if (maxBytes < 0)
            throw new ArgumentOutOfRangeException(
                nameof(maxBytes),
                "Maximum bytes cannot be negative"
            );
    }

    public override bool CanRead => _baseStream.CanRead;
    public override bool CanSeek => _baseStream.CanSeek;
    public override bool CanWrite => false; // Always false - writing is not allowed
    public override long Length => Math.Min(_baseStream.Length, _maxBytes);

    public override long Position
    {
        get => _baseStream.Position;
        set => _baseStream.Position = value;
    }

    public long BytesRead { get; private set; }

    public override int Read(byte[] buffer, int offset, int count)
    {
        // Check if we've already exceeded the limit
        if (BytesRead > _maxBytes)
            throw new InvalidOperationException(
                $"Cannot read beyond the maximum limit of {_maxBytes} bytes"
            );

        var bytesActuallyRead = _baseStream.Read(buffer, offset, count);
        BytesRead += bytesActuallyRead;

        // Check if we've now exceeded the limit (in case the underlying stream returned more than expected)
        if (BytesRead <= _maxBytes)
            return bytesActuallyRead;
        BytesRead -= bytesActuallyRead; // Roll back the count
        throw new FileStorageException(
            FileStorageErrorCode.TooLarge,
            $"Maximum file size is {_maxBytes} bytes"
        );
    }

    public override void Write(byte[] buffer, int offset, int count)
    {
        throw new NotSupportedException("Writing is not supported by LimitedStream");
    }

    public override void WriteByte(byte value)
    {
        throw new NotSupportedException("Writing is not supported by LimitedStream");
    }

    public override void Flush()
    {
        // No-op since we don't support writing
    }

    public override long Seek(long offset, SeekOrigin origin)
    {
        return _baseStream.Seek(offset, origin);
    }

    public override void SetLength(long value)
    {
        throw new NotSupportedException("Setting length is not supported by LimitedStream");
    }

    protected override void Dispose(bool disposing)
    {
        if (disposing)
        {
            _baseStream?.Dispose();
        }
        base.Dispose(disposing);
    }
}
