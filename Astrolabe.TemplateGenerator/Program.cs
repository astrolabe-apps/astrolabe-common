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
        AnsiConsole.MarkupLine($"[bold green]Creating solution:[/] [blue]{config.SolutionName}[/] with project [blue]{config.ProjectName}[/]");
        AnsiConsole.WriteLine();

        var generator = new TemplateGenerator(config);

        await AnsiConsole
            .Progress()
            .AutoClear(false)
            .HideCompleted(false)
            .Columns(
                new TaskDescriptionColumn(),
                new ProgressBarColumn(),
                new PercentageColumn(),
                new SpinnerColumn()
            )
            .StartAsync(async ctx =>
            {
                // Define the total number of steps (7 or 6 depending on demo data)
                var totalSteps = config.IncludeDemoData ? 7 : 6;
                var overallTask = ctx.AddTask(
                    "[bold blue]Generating project[/]",
                    maxValue: totalSteps
                );

                // Step 1: Create backend
                overallTask.Description =
                    "[bold blue]Generating project[/] - [green]Creating backend project[/]";
                await generator.CreateBackend();
                overallTask.Increment(1);

                // Step 2: Create frontend
                overallTask.Description =
                    "[bold blue]Generating project[/] - [green]Creating frontend structure[/]";
                await generator.CreateFrontend();
                overallTask.Increment(1);

                // Step 3: Initialize Rush
                overallTask.Description =
                    "[bold blue]Generating project[/] - [green]Initializing Rush[/]";
                await generator.InitializeRush();
                overallTask.Increment(1);

                // Step 4: Build backend
                overallTask.Description =
                    "[bold blue]Generating project[/] - [green]Building backend[/]";
                await generator.BuildBackend();
                overallTask.Increment(1);

                // Step 5: Generate TypeScript client
                overallTask.Description =
                    "[bold blue]Generating project[/] - [green]Generating TypeScript client[/]";
                await generator.GenerateTypeScriptClient();
                overallTask.Increment(1);

                // Step 6: Seed database (conditional)
                if (config.IncludeDemoData)
                {
                    overallTask.Description =
                        "[bold blue]Generating project[/] - [green]Seeding database with sample data[/]";
                    await generator.SeedDatabase();
                    overallTask.Increment(1);
                }

                // Step 7: Install frontend dependencies
                overallTask.Description =
                    "[bold blue]Generating project[/] - [green]Installing frontend dependencies[/]";
                await generator.InstallFrontendDependencies();
                overallTask.Increment(1);

                overallTask.Description = "[bold blue]Generating project[/] - [green]Complete![/]";
                overallTask.StopTask();
            });

        AnsiConsole.WriteLine();
        AnsiConsole.MarkupLine("[bold green]✓[/] Application created successfully!");
        AnsiConsole.WriteLine();
        AnsiConsole.MarkupLine($"[bold]Next steps:[/]");
        AnsiConsole.MarkupLine($"  1. cd {config.SolutionName}/{config.ProjectName}");
        AnsiConsole.MarkupLine(
            $"  2. Update connection string in appsettings.Development.json if needed"
        );
        AnsiConsole.MarkupLine(
            $"  3. dotnet run (backend will start on https://localhost:{config.HttpsPort})"
        );
        AnsiConsole.MarkupLine(
            $"  4. In another terminal: cd ClientApp/sites/{config.SiteName} && rushx dev"
        );
        AnsiConsole.MarkupLine($"  5. Open https://localhost:{config.HttpsPort}");

        return 0;
    }

    static Task<AppConfiguration> GatherConfiguration()
    {
        var projectName = AnsiConsole.Ask<string>("[blue]Project name:[/]");

        var solutionName = AnsiConsole.Ask(
            "[blue]Solution name:[/]",
            projectName
        );

        var description = AnsiConsole.Ask("[blue]Description:[/]", "An Astrolabe application");

        var httpPort = AnsiConsole.Ask("[blue]HTTP port:[/]", 5000);
        var httpsPort = AnsiConsole.Ask("[blue]HTTPS port:[/]", 5001);
        var spaPort = AnsiConsole.Ask("[blue]SPA development port:[/]", 8000);

        var siteName = AnsiConsole.Ask(
            "[blue]Initial site name:[/]",
            $"{projectName.ToLowerInvariant()}-site"
        );

        var connectionString = AnsiConsole.Ask(
            "[blue]Database connection string:[/]",
            $"Server=localhost;Database={projectName}Db;User=sa;Password=databasePassword1234;MultipleActiveResultSets=true;TrustServerCertificate=true;"
        );

        var includeDemoData = AnsiConsole.Confirm(
            "[blue]Include demo data (Tea model/controller/endpoints)?[/]",
            defaultValue: true
        );

        return Task.FromResult(
            new AppConfiguration(
                solutionName,
                projectName,
                description,
                httpPort,
                httpsPort,
                spaPort,
                siteName,
                connectionString,
                includeDemoData
            )
        );
    }
}

public record AppConfiguration(
    string SolutionName,
    string ProjectName,
    string Description,
    int HttpPort,
    int HttpsPort,
    int SpaPort,
    string SiteName,
    string ConnectionString,
    bool IncludeDemoData
);
