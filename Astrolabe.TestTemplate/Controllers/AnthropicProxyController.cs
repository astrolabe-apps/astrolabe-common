using Astrolabe.TestTemplate.Service;
using Astrolabe.TestTemplate.Models;
using Microsoft.AspNetCore.Mvc;
using System.Text;
using System.Text.Json;

namespace Astrolabe.TestTemplate.Controllers;

[ApiController]
[Route("api/anthropic")]
public class AnthropicProxyController : ControllerBase
{
    private readonly AnthropicService _anthropicService;
    private readonly ILogger<AnthropicProxyController> _logger;

    public AnthropicProxyController(AnthropicService anthropicService, ILogger<AnthropicProxyController> logger)
    {
        _anthropicService = anthropicService;
        _logger = logger;
    }

    /// <summary>
    /// Proxy endpoint for Anthropic Messages API
    /// </summary>
    /// <param name="request">The message request to send to Anthropic</param>
    /// <returns>The response from Anthropic API</returns>
    [HttpPost("messages")]
    public async Task<object> CreateMessage([FromBody] object request)
    {
        if (request == null)
        {
            throw new ArgumentException("Request body is required");
        }

        _logger.LogInformation("Proxying message request to Anthropic API");

        return await _anthropicService.CreateMessage(request);
    }

    /// <summary>
    /// Process a command using Claude with structured response
    /// </summary>
    /// <param name="request">The command processing request</param>
    /// <returns>Processed command response</returns>
    [HttpPost("process-command")]
    public async Task<ProcessCommandResponse> ProcessCommand([FromBody] ProcessCommandRequest request)
    {
        if (request == null)
        {
            return new ProcessCommandResponse
            {
                Response = "Request body is required",
                Success = false
            };
        }

        _logger.LogInformation("Processing command: {Command}", request.Command);

        return await _anthropicService.ProcessCommand(request);
    }

    /// <summary>
    /// Stream a command using Claude with real-time responses
    /// </summary>
    /// <param name="request">The command processing request</param>
    /// <returns>Server-sent events stream</returns>
    [HttpPost("stream-command")]
    public async Task StreamCommand([FromBody] ProcessCommandRequest request)
    {
        if (request == null)
        {
            Response.StatusCode = 400;
            await Response.WriteAsync("Request body is required");
            return;
        }

        _logger.LogInformation("Streaming command: {Command}", request.Command);

        Response.Headers.Append("Content-Type", "text/event-stream");
        Response.Headers.Append("Cache-Control", "no-cache");
        Response.Headers.Append("Connection", "keep-alive");
        Response.Headers.Append("Access-Control-Allow-Origin", "*");

        try
        {
            await foreach (var chunk in _anthropicService.StreamCompletion(request, HttpContext.RequestAborted))
            {
                var jsonChunk = JsonSerializer.Serialize(chunk, new JsonSerializerOptions
                {
                    PropertyNamingPolicy = JsonNamingPolicy.CamelCase
                });

                await Response.WriteAsync($"data: {jsonChunk}\n\n");
                await Response.Body.FlushAsync();

                if (HttpContext.RequestAborted.IsCancellationRequested)
                    break;
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during streaming command");
            var errorChunk = JsonSerializer.Serialize(new StreamChunk
            {
                Type = "error",
                Error = ex.Message
            }, new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase
            });

            await Response.WriteAsync($"data: {errorChunk}\n\n");
        }
        finally
        {
            await Response.WriteAsync("data: [DONE]\n\n");
        }
    }

    /// <summary>
    /// Health check endpoint for the Anthropic proxy
    /// </summary>
    /// <returns>Health status</returns>
    [HttpGet("health")]
    public object HealthCheck()
    {
        // Check if API key is configured
        var apiKey = HttpContext.RequestServices.GetService<IConfiguration>()?["Anthropic:ApiKey"];
        var isConfigured = !string.IsNullOrEmpty(apiKey);

        return new
        {
            status = "healthy",
            configured = isConfigured,
            timestamp = DateTime.UtcNow
        };
    }
}