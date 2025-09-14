# Anthropic API Proxy Implementation Plan

## Overview
Implement a server-side proxy in Astrolabe.TestTemplate to handle Anthropic client calls, ensuring the API key remains secure and is not exposed to the public client.

## Requirements
- Proxy Anthropic API calls through the server
- Keep API key secure on server-side only
- Maintain existing client functionality
- Handle authentication and authorization appropriately
- Support all necessary Anthropic API endpoints

## Implementation Steps

### 1. Server-Side Proxy Controller
- **Location**: `Astrolabe.TestTemplate` server project
- **Changes**:
  - Create new `AnthropicProxyController`
  - Add endpoints that mirror required Anthropic API calls
  - Handle API key securely in server configuration
  - Forward requests to actual Anthropic API
  - Return responses to client

### 2. Configuration Management
- **Location**: Server configuration files
- **Changes**:
  - Add Anthropic API key to secure configuration (appsettings.json, environment variables, or Azure Key Vault)
  - Configure HttpClient for Anthropic API calls
  - Set up dependency injection for Anthropic service
  - Handle configuration validation

### 3. Client-Side Updates
- **Location**: Client application code
- **Changes**:
  - Update client to call local proxy endpoints instead of Anthropic API directly
  - Remove API key from client-side code
  - Update request/response handling if needed
  - Maintain existing functionality

### 4. Security Implementation
- **Location**: Proxy controller and middleware
- **Changes**:
  - Implement authentication/authorization for proxy endpoints
  - Add rate limiting if needed
  - Validate and sanitize incoming requests
  - Log requests appropriately (without logging sensitive data)

### 5. Error Handling
- **Location**: Proxy controller
- **Changes**:
  - Handle Anthropic API errors gracefully
  - Map error responses appropriately
  - Implement retry logic if needed
  - Provide meaningful error messages to client

## Technical Implementation

### Proxy Controller Structure
```csharp
[ApiController]
[Route("api/anthropic")]
public class AnthropicProxyController : ControllerBase
{
    private readonly IAnthropicService _anthropicService;

    public AnthropicProxyController(IAnthropicService anthropicService)
    {
        _anthropicService = anthropicService;
    }

    [HttpPost("messages")]
    public async Task<IActionResult> CreateMessage([FromBody] CreateMessageRequest request)
    {
        var response = await _anthropicService.CreateMessage(request);
        return Ok(response);
    }
}
```

### Service Layer
```csharp
public interface IAnthropicService
{
    Task<object> CreateMessage(CreateMessageRequest request);
    // Add other required methods
}

public class AnthropicService : IAnthropicService
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;

    public AnthropicService(HttpClient httpClient, IConfiguration configuration)
    {
        _httpClient = httpClient;
        _configuration = configuration;

        var apiKey = _configuration["Anthropic:ApiKey"];
        _httpClient.DefaultRequestHeaders.Add("x-api-key", apiKey);
        _httpClient.DefaultRequestHeaders.Add("anthropic-version", "2023-06-01");
    }
}
```

### Configuration Setup
```json
{
  "Anthropic": {
    "ApiKey": "sk-ant-...",
    "BaseUrl": "https://api.anthropic.com/v1"
  }
}
```

### Client-Side Updates
```typescript
// Instead of calling Anthropic API directly
const response = await fetch('/api/anthropic/messages', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(messageRequest)
});
```

## Technical Considerations

### Security Best Practices
- Store API key in secure configuration (never in code)
- Use HTTPS for all communications
- Implement proper authentication for proxy endpoints
- Validate all incoming requests
- Don't log sensitive data

### Performance Considerations
- Configure HttpClient properly (avoid socket exhaustion)
- Implement connection pooling
- Consider caching where appropriate
- Handle timeouts appropriately

### Error Handling
- Map Anthropic API errors to appropriate HTTP status codes
- Provide consistent error response format
- Log errors for debugging (without sensitive data)
- Implement circuit breaker pattern if needed

### Scalability
- Consider rate limiting on proxy endpoints
- Handle concurrent requests appropriately
- Monitor API usage and costs
- Implement request queuing if needed

## Testing Strategy

### Unit Tests
- Test proxy controller endpoints
- Test service layer methods
- Test error handling scenarios
- Test configuration validation

### Integration Tests
- Test end-to-end proxy functionality
- Test with actual Anthropic API (in test environment)
- Test error scenarios and edge cases
- Test authentication and authorization

### Security Tests
- Verify API key is not exposed in responses
- Test authentication requirements
- Verify request validation
- Test rate limiting functionality

## Deployment Considerations
- Ensure API key is configured securely in production
- Set up monitoring and logging
- Configure appropriate timeouts
- Set up health checks for proxy endpoints

## Documentation Updates
- Document new proxy endpoints
- Update client-side integration guide
- Document configuration requirements
- Include security best practices

## Success Criteria
- [x] Anthropic API key is secured on server-side only
- [x] Client can make API calls through proxy without direct API access
- [x] All required Anthropic functionality works through proxy
- [x] Proper error handling and logging implemented
- [x] Security measures implemented (authentication, validation)
- [x] Performance is acceptable
- [x] Comprehensive test coverage