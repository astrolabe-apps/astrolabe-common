using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Primitives;

namespace Astrolabe.Web.Common;

public static class VirtualHostingExtensions
{
    public static IApplicationBuilder UseDomainSpa(
        this IApplicationBuilder app,
        IWebHostEnvironment env,
        string siteDir,
        string? domainPrefix = null,
        bool fallback = false,
        DomainSpaOptions? options = null,
        Func<HttpRequest, bool>? match = null,
        PathString? pathString = null
    )
    {
        domainPrefix ??= siteDir + ".";
        options ??= new DomainSpaOptions();
        match ??=
            pathString != null
                ? r => r.Path.StartsWithSegments(pathString.Value)
                : r => r.Host.Host.StartsWith(domainPrefix);
        var buildDir = Path.Combine(env.ContentRootPath, "ClientApp/sites", siteDir, "out");
        if (!Directory.Exists(buildDir))
        {
            Directory.CreateDirectory(buildDir);
        }

        var fileOptions = new StaticFileOptions()
        {
            FileProvider = new HtmlFileProvider(buildDir),
            RequestPath = pathString?.Value,
            ServeUnknownFileTypes = true,
            DefaultContentType = "text/html;charset=UTF-8",
            OnPrepareResponse = (ctx) =>
                ctx.Context.Response.Headers.CacheControl = options.CacheControl,
        };
        app.UseWhen(
            ctx => fallback || match(ctx.Request),
            (app2) =>
            {
                app2.UseStaticFiles(fileOptions);

                app2.UseSpa(spa =>
                {
                    spa.Options.SourcePath = "ClientApp";
                    spa.Options.DefaultPage = (pathString ?? "") + "/index.html";
                    spa.Options.DefaultPageStaticFileOptions = fileOptions;
                });
            }
        );
        return app;
    }

    class HtmlFileProvider : IFileProvider
    {
        private readonly PhysicalFileProvider _provider;

        public HtmlFileProvider(string rootPath)
        {
            _provider = new PhysicalFileProvider(rootPath);
        }

        public IDirectoryContents GetDirectoryContents(string subpath)
        {
            return _provider.GetDirectoryContents(subpath);
        }

        private string ResolveDynamic(string path)
        {
            var parentPath = Path.GetDirectoryName(path);
            var filename = Path.GetFileName(path);
            if (parentPath == null)
                return path;
            var resolvedParent = ResolveDynamic(parentPath);
            var dirContents = GetDirectoryContents(resolvedParent);
            var dynamic = dirContents.FirstOrDefault(x => x.Name.StartsWith("["));
            if (!resolvedParent.EndsWith("/"))
                resolvedParent += "/";
            return resolvedParent
                + (dynamic != null ? Path.GetFileNameWithoutExtension(dynamic.Name) : filename);
        }

        public IFileInfo GetFileInfo(string subpath)
        {
            var extension = Path.GetExtension(subpath);
            if (extension == "" && subpath != "/")
            {
                return _provider.GetFileInfo(ResolveDynamic(subpath) + ".html");
            }
            return _provider.GetFileInfo(subpath);
        }

        public IChangeToken Watch(string filter)
        {
            return NullChangeToken.Singleton;
        }
    }
}

public class DomainSpaOptions
{
    public string CacheControl { get; set; } = "private, max-age=30, must-revalidate";
}
