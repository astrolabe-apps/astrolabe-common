using System.Diagnostics;
using System.Text;

namespace Astrolabe.TemplateGenerator;

public class TemplateGenerator
{
    private readonly AppConfiguration _config;
    private readonly string _templateRoot;
    private string SolutionPath => Path.Combine(Environment.CurrentDirectory, _config.SolutionName);
    private string ProjectPath => Path.Combine(SolutionPath, _config.ProjectName);
    private string ClientAppPath => Path.Combine(ProjectPath, "ClientApp");

    public TemplateGenerator(AppConfiguration config)
    {
        _config = config;
        _templateRoot = Path.Combine(AppContext.BaseDirectory, "Templates");
    }

    public async Task CreateBackend()
    {
        // Create solution directory structure
        Directory.CreateDirectory(SolutionPath);
        Directory.CreateDirectory(ProjectPath);

        // Copy solution-level files (Root template)
        await CopyAndProcessDirectory(Path.Combine(_templateRoot, "Root"), SolutionPath);

        // Copy and process backend template files to project directory
        var backendTemplate = _config.IncludeDemoData ? "Demo" : "Skeleton";
        await CopyAndProcessDirectory(Path.Combine(_templateRoot, backendTemplate, "Backend"), ProjectPath);
    }

    public async Task CreateFrontend()
    {
        // Copy and process frontend template files
        var frontendTemplate = _config.IncludeDemoData ? "Demo" : "Skeleton";
        await CopyAndProcessDirectory(Path.Combine(_templateRoot, frontendTemplate, "Frontend"), ClientAppPath);
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
            var fileName = Path.GetFileName(file);
            var targetPath = Path.Combine(targetDir, ProcessFileName(fileName));
            await CopyAndProcessFile(file, targetPath);
        }

        foreach (var dir in Directory.GetDirectories(sourceDir))
        {
            var dirName = Path.GetFileName(dir);
            await CopyAndProcessDirectory(dir, Path.Combine(targetDir, ProcessFileName(dirName)));
        }
    }

    private async Task CopyAndProcessFile(string sourcePath, string targetPath)
    {
        var content = await File.ReadAllTextAsync(sourcePath);
        var processed = ProcessTemplateContent(content);
        await File.WriteAllTextAsync(targetPath, processed);
    }

    private string ProcessFileName(string fileName)
    {
        return fileName
            .Replace("__SolutionName__", _config.SolutionName)
            .Replace("__ProjectName__", _config.ProjectName)
            .Replace("__SiteName__", _config.SiteName);
    }

    private string ProcessTemplateContent(string content)
    {
        var namespaceProjectName = SanitizeForNamespace(_config.ProjectName);

        return content
            .Replace("__SolutionName__", _config.SolutionName)
            .Replace("__ProjectName__", namespaceProjectName)
            .Replace("__Description__", _config.Description)
            .Replace("__HttpPort__", _config.HttpPort.ToString())
            .Replace("__HttpsPort__", _config.HttpsPort.ToString())
            .Replace("__SpaPort__", _config.SpaPort.ToString())
            .Replace("__SiteName__", _config.SiteName)
            .Replace("__ConnectionString__", _config.ConnectionString);
    }

    private static string SanitizeForNamespace(string name)
    {
        // Replace hyphens and other invalid characters with underscores
        // C# namespace identifiers can only contain letters, digits, and underscores
        var result = System.Text.RegularExpressions.Regex.Replace(name, @"[^a-zA-Z0-9_]", "_");

        // Ensure it doesn't start with a digit
        if (char.IsDigit(result[0]))
        {
            result = "_" + result;
        }

        return result;
    }

    private Process? StartBackendProcess()
    {
        var processStartInfo = new ProcessStartInfo
        {
            FileName = "dotnet",
            Arguments = "run",
            WorkingDirectory = ProjectPath,
            UseShellExecute = false,
            CreateNoWindow = false,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
        };

        var process = Process.Start(processStartInfo);

        if (process != null)
        {
            // Log output in background
            Task.Run(async () =>
            {
                while (!process.StandardOutput.EndOfStream)
                {
                    var line = await process.StandardOutput.ReadLineAsync();
                    if (line != null)
                        Console.WriteLine($"[Backend] {line}");
                }
            });

            Task.Run(async () =>
            {
                while (!process.StandardError.EndOfStream)
                {
                    var line = await process.StandardError.ReadLineAsync();
                    if (line != null)
                        Console.Error.WriteLine($"[Backend Error] {line}");
                }
            });
        }

        return process;
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
