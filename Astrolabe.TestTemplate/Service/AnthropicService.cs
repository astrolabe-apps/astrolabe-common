using System.Text;
using System.Text.Json;

namespace Astrolabe.TestTemplate.Service;

public class AnthropicService
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;
    private readonly ILogger<AnthropicService> _logger;

    public AnthropicService(HttpClient httpClient, IConfiguration configuration, ILogger<AnthropicService> logger)
    {
        _httpClient = httpClient;
        _configuration = configuration;
        _logger = logger;

        var apiKey = _configuration["Anthropic:ApiKey"];
        if (string.IsNullOrEmpty(apiKey))
        {
            throw new InvalidOperationException("Anthropic API key is not configured. Please set Anthropic:ApiKey in configuration.");
        }

        var baseUrl = _configuration["Anthropic:BaseUrl"] ?? "https://api.anthropic.com/v1";
        _httpClient.BaseAddress = new Uri(baseUrl);
        _httpClient.DefaultRequestHeaders.Add("x-api-key", apiKey);
        _httpClient.DefaultRequestHeaders.Add("anthropic-version", "2023-06-01");
        _httpClient.DefaultRequestHeaders.Add("User-Agent", "Astrolabe-TestTemplate/1.0");
    }

    public async Task<object> CreateMessage(object request)
    {
        try
        {
            var jsonContent = JsonSerializer.Serialize(request, new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
                WriteIndented = false
            });

            _logger.LogDebug("Sending message to Anthropic API");

            var httpContent = new StringContent(jsonContent, Encoding.UTF8, "application/json");
            var response = await _httpClient.PostAsync("messages", httpContent);

            var responseContent = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("Anthropic API returned error: {StatusCode} - {Content}",
                    response.StatusCode, responseContent);

                // Try to parse error response
                try
                {
                    var errorResponse = JsonSerializer.Deserialize<object>(responseContent);
                    throw new HttpRequestException($"Anthropic API error: {response.StatusCode}")
                    {
                        Data = { { "StatusCode", response.StatusCode }, { "Response", errorResponse } }
                    };
                }
                catch (JsonException)
                {
                    throw new HttpRequestException($"Anthropic API error: {response.StatusCode} - {responseContent}");
                }
            }

            _logger.LogDebug("Received successful response from Anthropic API");

            // Parse and return the response as a generic object
            return JsonSerializer.Deserialize<object>(responseContent)
                ?? throw new InvalidOperationException("Received null response from Anthropic API");
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "HTTP error while calling Anthropic API");
            throw;
        }
        catch (TaskCanceledException ex)
        {
            _logger.LogError(ex, "Timeout while calling Anthropic API");
            throw new TimeoutException("Request to Anthropic API timed out", ex);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error while calling Anthropic API");
            throw;
        }
    }
}