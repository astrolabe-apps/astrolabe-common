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
        // Use pnpm dlx to download and run rush
        await RunCommand("pnpm", "dlx @microsoft/rush@5.153.2 update", ClientAppPath);
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
        // Already done in InitializeRush
        // This could run "npx rush install" if needed
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

        var processStartInfo = new ProcessStartInfo
        {
            FileName = fileName,
            Arguments = args,
            WorkingDirectory = workingDirectory,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true,
        };

        using var process = Process.Start(processStartInfo);
        if (process == null)
            throw new Exception($"Failed to start process: {fileName} {args}");

        var output = await process.StandardOutput.ReadToEndAsync();
        var error = await process.StandardError.ReadToEndAsync();

        await process.WaitForExitAsync();

        if (process.ExitCode != 0)
        {
            throw new Exception(
                $"Command failed: {fileName} {args}\nOutput: {output}\nError: {error}"
            );
        }
    }
}
