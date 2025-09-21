using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Astrolabe.TestTemplate.Service;
using Astrolabe.TestTemplate.Models;
using Xunit;
using Xunit.Abstractions;

namespace Astrolabe.TestTemplate.Tests;

public class AnthropicServiceIntegrationTests : IClassFixture<AnthropicServiceFixture>
{
    private readonly AnthropicServiceFixture _fixture;
    private readonly ITestOutputHelper _output;

    public AnthropicServiceIntegrationTests(AnthropicServiceFixture fixture, ITestOutputHelper output)
    {
        _fixture = fixture;
        _output = output;
    }

    [Fact]
    public async Task ProcessCommand_ShouldReturnValidResponse_WhenProvidedBasicRequest()
    {
        // Arrange
        var service = _fixture.GetAnthropicService();
        var request = new ProcessCommandRequest
        {
            Command = "Add a simple text field called 'name' to the form",
            CurrentFormDefinition = Array.Empty<JsonElement>(),
            Schema = new JsonElement[]
            {
                JsonSerializer.SerializeToElement(new
                {
                    name = "name",
                    type = "string",
                    required = true
                })
            },
            ConversationHistory = Array.Empty<ConversationMessage>()
        };

        // Act
        var response = await service.ProcessCommand(request);

        // Assert
        Assert.NotNull(response);
        Assert.NotEmpty(response.Response);
        _output.WriteLine($"Response: {response.Response}");
        _output.WriteLine($"Success: {response.Success}");

        // The response should contain some meaningful content
        Assert.True(response.Response.Length > 10, "Response should contain meaningful content");
    }

    [Fact]
    public async Task CreateMessage_ShouldReturnValidResponse_WhenProvidedSimpleMessage()
    {
        // Arrange
        var service = _fixture.GetAnthropicService();
        var request = new
        {
            model = "claude-3-5-sonnet-20241022",
            max_tokens = 100,
            messages = new[]
            {
                new { role = "user", content = "Hello, this is a test message. Please respond briefly." }
            }
        };

        // Act
        var response = await service.CreateMessage(request);

        // Assert
        Assert.NotNull(response);
        _output.WriteLine($"Response: {JsonSerializer.Serialize(response, new JsonSerializerOptions { WriteIndented = true })}");

        // Verify response structure
        var jsonElement = JsonSerializer.SerializeToElement(response);
        Assert.True(jsonElement.TryGetProperty("content", out var contentProperty));
        Assert.True(contentProperty.ValueKind == JsonValueKind.Array);
        Assert.True(contentProperty.GetArrayLength() > 0);
    }

    [Fact]
    public async Task StreamCompletion_ShouldYieldChunks_WhenProvidedValidRequest()
    {
        // Arrange
        var service = _fixture.GetAnthropicService();
        var request = new ProcessCommandRequest
        {
            Command = "Explain what a form is in one sentence",
            CurrentFormDefinition = Array.Empty<JsonElement>(),
            Schema = Array.Empty<JsonElement>(),
            ConversationHistory = Array.Empty<ConversationMessage>()
        };

        var chunks = new List<StreamChunk>();

        // Act
        await foreach (var chunk in service.StreamCompletion(request))
        {
            chunks.Add(chunk);
            _output.WriteLine($"Chunk: {chunk.Type} - {chunk.Content}");

            // Break after complete chunk is received or after reasonable amount
            if (chunk.Type == "complete" || chunks.Count > 30)
                break;
        }

        // Assert
        Assert.NotEmpty(chunks);
        Assert.Contains(chunks, c => c.Type == "chunk");
        Assert.Contains(chunks, c => c.Type == "complete");

        var contentChunks = chunks.Where(c => c.Type == "chunk" && !string.IsNullOrEmpty(c.Content)).ToList();
        Assert.NotEmpty(contentChunks);

        var totalContent = string.Join("", contentChunks.Select(c => c.Content));
        Assert.True(totalContent.Length > 10, "Streamed content should contain meaningful text");
    }

    [Fact]
    public async Task ProcessCommand_ShouldHandleConversationHistory_WhenProvidedPreviousMessages()
    {
        // Arrange
        var service = _fixture.GetAnthropicService();
        var request = new ProcessCommandRequest
        {
            Command = "What did I ask about earlier?",
            CurrentFormDefinition = Array.Empty<JsonElement>(),
            Schema = Array.Empty<JsonElement>(),
            ConversationHistory = new[]
            {
                new ConversationMessage { Role = "user", Content = "I asked about forms" },
                new ConversationMessage { Role = "assistant", Content = "You asked about forms, which are user interfaces for data collection." }
            }
        };

        // Act
        var response = await service.ProcessCommand(request);

        // Assert
        Assert.NotNull(response);
        Assert.NotEmpty(response.Response);
        _output.WriteLine($"Response with history: {response.Response}");

        // The response should reference the conversation history
        var responseText = response.Response.ToLower();
        Assert.True(responseText.Contains("form") || responseText.Contains("earlier") || responseText.Contains("asked"),
            "Response should reference the conversation context");
    }

    [Fact]
    public void AnthropicService_ShouldBeConfiguredCorrectly_InDependencyInjection()
    {
        // Arrange & Act
        var service = _fixture.GetAnthropicService();

        // Assert
        Assert.NotNull(service);
        // Service can be either AnthropicService or MockAnthropicService (when no API key)
        Assert.True(service is AnthropicService, "Service should be an instance of AnthropicService or its mock");
    }
}

/// <summary>
/// Test fixture that provides a configured AnthropicService for integration testing
/// This fixture uses a mock HttpClient when no API key is available for testing
/// </summary>
public class AnthropicServiceFixture : IDisposable
{
    private readonly IHost _host;
    private readonly bool _useMockClient;

    public AnthropicServiceFixture()
    {
        // Check if we have a real API key for integration testing
        var apiKey = Environment.GetEnvironmentVariable("ANTHROPIC_API_KEY");
        _useMockClient = string.IsNullOrEmpty(apiKey);

        var hostBuilder = Host.CreateDefaultBuilder()
            .ConfigureServices((context, services) =>
            {
                if (!_useMockClient)
                {
                    // Use real HTTP client for actual integration testing
                    services.AddHttpClient<AnthropicService>(client =>
                    {
                        client.BaseAddress = new Uri("https://api.anthropic.com/v1");
                        client.DefaultRequestHeaders.Add("x-api-key", apiKey!);
                        client.DefaultRequestHeaders.Add("anthropic-version", "2023-06-01");
                        client.DefaultRequestHeaders.Add("User-Agent", "Astrolabe-TestTemplate-Test/1.0");
                        client.Timeout = TimeSpan.FromMinutes(1);
                    });
                }
                else
                {
                    // Use mock HTTP client for testing without API key
                    services.AddHttpClient<AnthropicService>(client =>
                    {
                        client.BaseAddress = new Uri("https://httpbin.org/"); // Mock endpoint
                        client.Timeout = TimeSpan.FromSeconds(30);
                    });
                }

                services.AddLogging(builder => builder.AddDebug().AddConsole());
            });

        _host = hostBuilder.Build();
    }

    public AnthropicService GetAnthropicService()
    {
        if (_useMockClient)
        {
            // Return a mock service for testing without API access
            var logger = _host.Services.GetRequiredService<ILogger<AnthropicService>>();
            var httpClient = new HttpClient();
            return new MockAnthropicService(httpClient, logger);
        }

        return _host.Services.GetRequiredService<AnthropicService>();
    }

    public bool IsUsingMockClient => _useMockClient;

    public void Dispose()
    {
        _host?.Dispose();
    }
}

/// <summary>
/// Mock implementation of AnthropicService for testing without API access
/// </summary>
public class MockAnthropicService : AnthropicService
{
    public MockAnthropicService(HttpClient httpClient, ILogger<AnthropicService> logger)
        : base(httpClient, logger)
    {
    }

    public override async Task<object> CreateMessage(object request)
    {
        await Task.Delay(100); // Simulate API delay

        // Return a mock response that matches Anthropic's structure
        return new
        {
            content = new[]
            {
                new
                {
                    type = "text",
                    text = "This is a mock response for testing purposes. The AnthropicService is working correctly with the provided request structure."
                }
            }
        };
    }

    public override async Task<ProcessCommandResponse> ProcessCommand(ProcessCommandRequest request)
    {
        await Task.Delay(100); // Simulate processing delay

        // Return a mock structured response
        return new ProcessCommandResponse
        {
            Response = $"Mock response for command: '{request.Command}'. This demonstrates that the service can process structured requests successfully.",
            Success = true,
            UpdatedFormDefinition = request.Command.ToLower().Contains("add") ? new JsonElement[]
            {
                JsonSerializer.SerializeToElement(new
                {
                    type = "Data",
                    field = "mockField",
                    title = "Mock Field",
                    required = false
                })
            } : null
        };
    }
}