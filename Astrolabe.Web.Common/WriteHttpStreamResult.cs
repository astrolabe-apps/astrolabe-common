using Microsoft.AspNetCore.Http;
using Microsoft.Net.Http.Headers;

namespace Astrolabe.Web.Common;

public class WriteHttpStreamResult : IResult
{
    private readonly string _contentType;
    private readonly string _filename;
    private readonly Func<Stream, Task> _writeStream;
    private readonly string _disposition;

    public WriteHttpStreamResult(
        string contentType,
        string filename,
        Func<Stream, Task> writeStream,
        string disposition = "attachment"
    )
    {
        _contentType = contentType;
        _filename = filename;
        _writeStream = writeStream;
        _disposition = disposition;
    }

    public async Task ExecuteAsync(HttpContext httpContext)
    {
        var response = httpContext.Response;
        response.ContentType = _contentType;
        var contentDisposition = new ContentDispositionHeaderValue(_disposition);
        contentDisposition.SetHttpFileName(_filename);
        response.Headers[HeaderNames.ContentDisposition] = contentDisposition.ToString();
        await using var bodyStream = response.BodyWriter.AsStream();
        await _writeStream.Invoke(bodyStream);
    }
}