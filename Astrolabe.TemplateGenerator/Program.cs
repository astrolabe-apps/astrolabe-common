using Spectre.Console;

namespace Astrolabe.TemplateGenerator;

class Program
{
    static async Task<int> Main(string[] args)
    {
        AnsiConsole.Write(new FigletText("Astrolabe").LeftJustified().Color(Color.Blue));

        AnsiConsole.MarkupLine(
            "[bold]Welcome to the Astrolabe Full Stack Application Generator![/]"
        );
        AnsiConsole.WriteLine();

        var config = await GatherConfiguration();

        AnsiConsole.WriteLine();
        AnsiConsole.MarkupLine($"[bold green]Creating application:[/] [blue]{config.AppName}[/]");
        AnsiConsole.WriteLine();

        var generator = new TemplateGenerator(config);

        await AnsiConsole
            .Status()
            .Start(
                "Generating project structure...",
                async ctx =>
                {
                    ctx.Status("Creating backend project...");
                    await generator.CreateBackend();

                    ctx.Status("Creating frontend structure...");
                    await generator.CreateFrontend();

                    ctx.Status("Initializing Rush...");
                    await generator.InitializeRush();

                    ctx.Status("Building backend...");
                    await generator.BuildBackend();

                    ctx.Status("Starting backend and generating TypeScript client...");
                    await generator.GenerateTypeScriptClient();

                    ctx.Status("Installing frontend dependencies...");
                    await generator.InstallFrontendDependencies();
                }
            );

        AnsiConsole.WriteLine();
        AnsiConsole.MarkupLine("[bold green]✓[/] Application created successfully!");
        AnsiConsole.WriteLine();
        AnsiConsole.MarkupLine($"[bold]Next steps:[/]");
        AnsiConsole.MarkupLine($"  1. cd {config.AppName}");
        AnsiConsole.MarkupLine(
            $"  2. Update connection string in appsettings.Development.json if needed"
        );
        AnsiConsole.MarkupLine(
            $"  3. dotnet run (backend will start on https://localhost:{config.HttpsPort})"
        );
        AnsiConsole.MarkupLine(
            $"  4. In another terminal: cd ClientApp/sites/{config.SiteName} && npm run dev"
        );
        AnsiConsole.MarkupLine($"  5. Open https://localhost:{config.HttpsPort}");

        return 0;
    }

    static async Task<AppConfiguration> GatherConfiguration()
    {
        var appName = AnsiConsole.Ask<string>("[blue]Application name:[/]");

        var description = AnsiConsole.Ask("[blue]Description:[/]", "An Astrolabe application");

        var httpPort = AnsiConsole.Ask("[blue]HTTP port:[/]", 5000);
        var httpsPort = AnsiConsole.Ask("[blue]HTTPS port:[/]", 5001);
        var spaPort = AnsiConsole.Ask("[blue]SPA development port:[/]", 8000);

        var siteName = AnsiConsole.Ask(
            "[blue]Initial site name:[/]",
            $"{appName.ToLowerInvariant()}-site"
        );

        var connectionString = AnsiConsole.Ask(
            "[blue]Database connection string:[/]",
            $"Server=localhost;Database={appName}Db;User=sa;Password=databasePassword1234;MultipleActiveResultSets=true;TrustServerCertificate=true;"
        );

        return new AppConfiguration(
            appName,
            description,
            httpPort,
            httpsPort,
            spaPort,
            siteName,
            connectionString
        );
    }
}

public record AppConfiguration(
    string AppName,
    string Description,
    int HttpPort,
    int HttpsPort,
    int SpaPort,
    string SiteName,
    string ConnectionString
);
