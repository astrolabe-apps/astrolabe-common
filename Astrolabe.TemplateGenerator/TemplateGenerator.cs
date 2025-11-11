using System.Diagnostics;
using System.Text;

namespace Astrolabe.TemplateGenerator;

public class TemplateGenerator
{
    private readonly AppConfiguration _config;
    private readonly string _templateRoot;
    private string ProjectPath => Path.Combine(Environment.CurrentDirectory, _config.AppName);
    private string ClientAppPath => Path.Combine(ProjectPath, "ClientApp");

    public TemplateGenerator(AppConfiguration config)
    {
        _config = config;
        _templateRoot = Path.Combine(AppContext.BaseDirectory, "Templates");
    }

    public async Task CreateBackend()
    {
        Directory.CreateDirectory(ProjectPath);

        // Copy and process backend template files
        await CopyAndProcessDirectory(Path.Combine(_templateRoot, "Backend"), ProjectPath);
    }

    public async Task CreateFrontend()
    {
        // Copy and process frontend template files
        await CopyAndProcessDirectory(Path.Combine(_templateRoot, "Frontend"), ClientAppPath);
    }

    public async Task InitializeRush()
    {
        // Rush.json is already copied by CreateFrontend
        // Install dependencies only (don't build yet - code generation needs to happen first)
        Console.WriteLine("Installing Rush dependencies...");

        // Use rush update with options to prevent hanging:
        // --bypass-policy: Skip policy checks
        // -y: Auto-confirm npx package installation
        // Note: We don't use --full here because it triggers builds, which will fail
        // before code generation happens
        Console.WriteLine("Running rush update...");
        await RunCommand("npx", "-y @microsoft/rush@5.153.2 update --bypass-policy", ClientAppPath);
    }

    public async Task BuildBackend()
    {
        await RunCommand("dotnet", "restore", ProjectPath);
        await RunCommand("dotnet", "build", ProjectPath);
    }

    public async Task GenerateTypeScriptClient()
    {
        // Start the backend in the background
        var backendProcess = StartBackendProcess();

        try
        {
            // Wait for backend to be ready
            await WaitForBackendReady();

            // Run the code generation scripts in client-common
            // Note: Dependencies are already installed by InitializeRush()
            var clientCommonPath = Path.Combine(ClientAppPath, "client-common");
            await RunCommand("npm", "run gencode", clientCommonPath);
            await RunCommand("npm", "run geneditorschemas", clientCommonPath);
        }
        finally
        {
            // Stop the backend
            if (backendProcess != null && !backendProcess.HasExited)
            {
                backendProcess.Kill(true);
                backendProcess.Dispose();
            }
        }
    }

    public async Task InstallFrontendDependencies()
    {
        // Ensure all dependencies are installed - run rush update again to be safe
        await RunCommand("npx", "-y @microsoft/rush@5.153.2 update --bypass-policy", ClientAppPath);
    }

    public async Task SeedDatabase()
    {
        // Only seed database if demo data is included
        if (!_config.IncludeDemoData)
        {
            Console.WriteLine("Skipping database seeding (demo data not included)");
            return;
        }

        Console.WriteLine(
            "Database seeding will occur on first application start via DbSeeder class."
        );
        // The seed data will be applied by the backend application on startup
        // See the DbSeeder class in the generated backend project
        await Task.CompletedTask;
    }

    private async Task CopyAndProcessDirectory(string sourceDir, string targetDir)
    {
        if (!Directory.Exists(sourceDir))
            return;

        Directory.CreateDirectory(targetDir);

        foreach (var file in Directory.GetFiles(sourceDir))
        {
            // Skip demo data files if not included
            if (!_config.IncludeDemoData && IsTeaDemoFile(file))
                continue;

            var fileName = Path.GetFileName(file);
            var targetPath = Path.Combine(targetDir, ProcessFileName(fileName));
            await CopyAndProcessFile(file, targetPath);
        }

        foreach (var dir in Directory.GetDirectories(sourceDir))
        {
            var dirName = Path.GetFileName(dir);

            // Skip tea directory entirely if not included
            if (
                !_config.IncludeDemoData
                && dirName.Equals("tea", StringComparison.OrdinalIgnoreCase)
            )
                continue;

            await CopyAndProcessDirectory(dir, Path.Combine(targetDir, ProcessFileName(dirName)));
        }
    }

    private bool IsTeaDemoFile(string filePath)
    {
        var fileName = Path.GetFileName(filePath);
        var fileNameLower = fileName.ToLowerInvariant();

        // Check if file name contains "tea" (case insensitive)
        if (fileNameLower.Contains("tea"))
            return true;

        // DbSeeder is only needed for demo data
        if (fileName == "DbSeeder.cs")
            return true;

        // Read file content to check if it's Tea-related
        // (Some files might reference Tea without having it in the filename)
        var content = File.ReadAllText(filePath);

        // Check specific file patterns that are Tea-related
        return fileName == "TeasController.cs"
            || fileName == "Tea.cs"
            || (fileName == "AppForms.cs" && content.Contains("TeaEditorForm"))
            || (fileName == "AppDbContext.cs" && content.Contains("DbSet<Tea>"));
    }

    private async Task CopyAndProcessFile(string sourcePath, string targetPath)
    {
        var content = await File.ReadAllTextAsync(sourcePath);
        var processed = ProcessTemplateContent(content);

        // Remove Tea-specific content if demo data is not included
        if (!_config.IncludeDemoData)
        {
            processed = RemoveTeaContent(processed, Path.GetFileName(sourcePath));

            // Skip writing file if content is empty (e.g., migrations that should not be copied)
            if (string.IsNullOrWhiteSpace(processed))
                return;
        }

        await File.WriteAllTextAsync(targetPath, processed);
    }

    private string ProcessFileName(string fileName)
    {
        return fileName
            .Replace("__AppName__", _config.AppName)
            .Replace("__SiteName__", _config.SiteName);
    }

    private string ProcessTemplateContent(string content)
    {
        return content
            .Replace("__AppName__", _config.AppName)
            .Replace("__Description__", _config.Description)
            .Replace("__HttpPort__", _config.HttpPort.ToString())
            .Replace("__HttpsPort__", _config.HttpsPort.ToString())
            .Replace("__SpaPort__", _config.SpaPort.ToString())
            .Replace("__SiteName__", _config.SiteName)
            .Replace("__ConnectionString__", _config.ConnectionString);
    }

    private string RemoveTeaContent(string content, string fileName)
    {
        // Handle specific files that need Tea content removed
        switch (fileName)
        {
            case "AppForms.cs":
                // Remove Tea form definitions, leaving an empty array
                return @"using __AppName__.Controllers;
using __AppName__.Data;
using __AppName__.Services;
using Astrolabe.Schemas.CodeGen;

namespace __AppName__.Forms;

public class AppForms : FormBuilder<object?>
{
    public static readonly FormDefinition<object?>[] Forms =
    [
        // Add your form definitions here
    ];
}
".Replace("__AppName__", _config.AppName);

            case "AppDbContext.cs":
                // Remove Tea DbSet, leaving an empty DbContext
                return @"using Microsoft.EntityFrameworkCore;

namespace __AppName__.Data.EF;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    // Add your DbSet properties here
}
".Replace("__AppName__", _config.AppName);

            case "routes.tsx":
                // Remove tea route
                return @"export default {
  """": {
    label: ""Home"",
  },
  editor: {
    label: ""Schema Editor"",
  },
}";

            case "page.tsx":
                // Check if this is the home page that links to tea
                if (content.Contains("Tea Manager"))
                {
                    // Remove the Tea Manager link card
                    return @"""use client"";

import Link from ""next/link"";

export default function Home() {
  return (
    <main className=""flex min-h-screen flex-col items-center justify-center p-24"">
      <div className=""z-10 max-w-5xl w-full items-center justify-between font-mono text-sm"">
        <h1 className=""text-4xl font-bold mb-8"">Welcome to __AppName__</h1>
        <p className=""mb-8"">__Description__</p>

        <div className=""grid grid-cols-1 md:grid-cols-2 gap-4"">
          <Link
            href=""/editor""
            className=""block p-6 bg-white border border-gray-200 rounded-lg shadow hover:bg-gray-100""
          >
            <h2 className=""text-2xl font-semibold mb-2"">Schema Editor →</h2>
            <p className=""text-gray-700"">
              Edit and manage your form schemas
            </p>
          </Link>
        </div>
      </div>
    </main>
  );
}
".Replace("__AppName__", _config.AppName).Replace("__Description__", _config.Description);
                }
                break;

            case "20250101000000_InitialCreate.cs":
            case "AppDbContextModelSnapshot.cs":
                // Skip migrations that reference Tea - don't copy them at all
                return string.Empty;

            case "Program.cs":
                // Remove DbSeeder call if demo data is not included
                if (content.Contains("DbSeeder.SeedAsync"))
                {
                    return content.Replace(
                        "\n        // Seed database with initial data\n        await __AppName__.Data.DbSeeder.SeedAsync(db);",
                        ""
                    );
                }
                break;
        }

        return content;
    }

    private Process? StartBackendProcess()
    {
        var processStartInfo = new ProcessStartInfo
        {
            FileName = "dotnet",
            Arguments = "run",
            WorkingDirectory = ProjectPath,
            UseShellExecute = false,
            CreateNoWindow = true,
        };

        return Process.Start(processStartInfo);
    }

    private async Task WaitForBackendReady()
    {
        var maxAttempts = 30;
        var attempt = 0;

        using var httpClient = new HttpClient();
        while (attempt < maxAttempts)
        {
            try
            {
                var response = await httpClient.GetAsync(
                    $"http://localhost:{_config.HttpPort}/swagger/v1/swagger.json"
                );
                if (response.IsSuccessStatusCode)
                    return;
            }
            catch
            {
                // Backend not ready yet
            }

            await Task.Delay(1000);
            attempt++;
        }

        throw new Exception("Backend failed to start");
    }

    private async Task RunCommand(string command, string arguments, string workingDirectory)
    {
        // On Windows, we need to run npm/npx/pnpm commands through cmd.exe
        var isWindows = OperatingSystem.IsWindows();
        var fileName = command;
        var args = arguments;

        if (isWindows && (command == "npm" || command == "npx" || command == "pnpm"))
        {
            fileName = "cmd.exe";
            args = $"/c {command} {arguments}";
        }

        Console.WriteLine($"Running: {fileName} {args}");
        Console.WriteLine($"Working directory: {workingDirectory}");

        var processStartInfo = new ProcessStartInfo
        {
            FileName = fileName,
            Arguments = args,
            WorkingDirectory = workingDirectory,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = false, // Changed to false to see output
        };

        using var process = Process.Start(processStartInfo);
        if (process == null)
            throw new Exception($"Failed to start process: {fileName} {args}");

        var outputBuilder = new StringBuilder();
        var errorBuilder = new StringBuilder();

        // Read output in real-time
        var outputTask = Task.Run(async () =>
        {
            while (!process.StandardOutput.EndOfStream)
            {
                var line = await process.StandardOutput.ReadLineAsync();
                if (line != null)
                {
                    Console.WriteLine(line);
                    outputBuilder.AppendLine(line);
                }
            }
        });

        var errorTask = Task.Run(async () =>
        {
            while (!process.StandardError.EndOfStream)
            {
                var line = await process.StandardError.ReadLineAsync();
                if (line != null)
                {
                    Console.Error.WriteLine(line);
                    errorBuilder.AppendLine(line);
                }
            }
        });

        await Task.WhenAll(outputTask, errorTask);
        await process.WaitForExitAsync();

        var output = outputBuilder.ToString();
        var error = errorBuilder.ToString();

        if (process.ExitCode != 0)
        {
            throw new Exception(
                $"Command failed: {fileName} {args}\nOutput: {output}\nError: {error}"
            );
        }

        Console.WriteLine($"Command completed successfully: {fileName} {args}");
    }
}
