using Astrolabe.TestTemplate.Service;
using Microsoft.AspNetCore.Mvc;

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