using Microsoft.AspNetCore.Mvc;
using Microsoft.Net.Http.Headers;

namespace Astrolabe.Web.Common;

public class WriteStreamResult : FileResult
{
    private readonly Func<Stream, Task> _writeStream;
    private readonly string _disposition;

    public WriteStreamResult(
        string contentType,
        string filename,
        Func<Stream, Task> writeStream,
        string disposition = "attachment"
    )
        : base(contentType)
    {
        _writeStream = writeStream;
        _disposition = disposition;
        FileDownloadName = filename;
    }

    public override async Task ExecuteResultAsync(ActionContext context)
    {
        var response = context.HttpContext.Response;
        response.ContentType = ContentType;
        var contentDisposition = new ContentDispositionHeaderValue(_disposition);
        contentDisposition.SetHttpFileName(FileDownloadName);
        context.HttpContext.Response.Headers[HeaderNames.ContentDisposition] =
            contentDisposition.ToString();
        await using var bodyStream = response.BodyWriter.AsStream();
        await _writeStream.Invoke(bodyStream);
    }
}
