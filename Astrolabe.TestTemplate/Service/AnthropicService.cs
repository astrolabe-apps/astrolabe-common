using System.Text;
using System.Text.Json;
using System.Runtime.CompilerServices;
using Astrolabe.TestTemplate.Models;

namespace Astrolabe.TestTemplate.Service;

public class AnthropicService
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<AnthropicService> _logger;

    public AnthropicService(HttpClient httpClient, ILogger<AnthropicService> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
    }

    public virtual async Task<object> CreateMessage(object request)
    {
        try
        {
            var jsonContent = JsonSerializer.Serialize(request, new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
                WriteIndented = false
            });

            _logger.LogDebug("Sending message to Anthropic API. Base URL: {BaseUrl}", _httpClient.BaseAddress);
            _logger.LogDebug("Request payload: {Payload}", jsonContent);

            var httpContent = new StringContent(jsonContent, Encoding.UTF8, "application/json");
            var fullUrl = new Uri(_httpClient.BaseAddress!, "messages");
            _logger.LogDebug("Making POST request to: {FullUrl}", fullUrl);
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

    public virtual async Task<ProcessCommandResponse> ProcessCommand(ProcessCommandRequest request)
    {
        try
        {
            var systemPrompt = BuildSystemPrompt(request.Schema, request.CurrentFormDefinition);
            var messages = BuildMessages(request.ConversationHistory, request.Command);

            var anthropicRequest = new
            {
                model = "claude-3-7-sonnet-latest",
                max_tokens = 8192,
                system = systemPrompt,
                messages = messages,
                tools = GetFormTools()
            };

            var response = await CreateMessage(anthropicRequest);
            return ProcessAnthropicResponse(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing command");
            return new ProcessCommandResponse
            {
                Response = $"Error processing command: {ex.Message}",
                Success = false
            };
        }
    }

    public async IAsyncEnumerable<StreamChunk> StreamCompletion(ProcessCommandRequest request, [EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        // For now, we'll use the non-streaming API and simulate streaming
        // This ensures compatibility while we work with the SDK's current capabilities

        ProcessCommandResponse? response = null;

        // Get the response outside of yield context
        response = await ProcessCommand(request);

        // Check for errors first
        if (!response.Success)
        {
            yield return new StreamChunk
            {
                Type = "error",
                Error = response.Response
            };
            yield break;
        }

        // Simulate streaming by yielding the response in chunks
        if (!string.IsNullOrEmpty(response.Response))
        {
            var words = response.Response.Split(' ');
            foreach (var word in words)
            {
                if (cancellationToken.IsCancellationRequested)
                    break;

                yield return new StreamChunk
                {
                    Type = "chunk",
                    Content = word + " "
                };

                // Small delay to simulate streaming
                await Task.Delay(50, cancellationToken);
            }
        }

        // If there's a tool call result, yield that
        if (response.UpdatedFormDefinition != null)
        {
            yield return new StreamChunk
            {
                Type = "tool_use",
                Content = "",
                ToolCall = new { form_definition = response.UpdatedFormDefinition }
            };
        }

        yield return new StreamChunk { Type = "complete", Content = "" };
    }

    private string BuildSystemPrompt(JsonElement[] schema, JsonElement[] currentFormDefinition)
    {
        var formInfo = ExtractFormInfo(currentFormDefinition);
        var schemaInfo = JsonSerializer.Serialize(schema, new JsonSerializerOptions { WriteIndented = true });

        return $@"You are an AI assistant that helps users modify form schemas using structured tools. You have deep knowledge of the Astrolabe control definition system.

Current Form:
- Fields: {string.Join(", ", formInfo.Fields)}

Schema:
{schemaInfo}

## Schema-First Approach

**ALWAYS reference the provided schema to:**
- Verify field existence before creating Data controls
- Use correct field types and validation
- Respect enumValues for dropdown/selection controls
- Apply schema-defined constraints
- Understand field relationships and dependencies

**Schema Property Mapping:**
- Schema ""required"" → Control ""required"": true
- Schema ""enumValues"" → Use Dropdown/Radio render types
- Schema ""maxLength"" → Add appropriate validation
- Schema nested objects → Use Group controls

## Common Modification Patterns

**Adding a new field:**
- Always check schema for field type and constraints
- Use appropriate render type for data type
- Consider validation requirements
- Place logically within form structure

**Example: Adding a text field**
{{
  ""type"": ""Data"",
  ""field"": ""description"",
  ""title"": ""Description"",
  ""required"": false,
  ""renderOptions"": {{
    ""type"": ""Textfield"",
    ""placeholder"": ""Enter description..."",
    ""multiline"": true
  }}
}}

**Example: Adding a dropdown from schema**
{{
  ""type"": ""Data"",
  ""field"": ""status"",
  ""title"": ""Status"",
  ""required"": true,
  ""renderOptions"": {{
    ""type"": ""Dropdown""
  }}
}}

## Critical Validation Rules

**MUST VALIDATE:**
- All field names exist in schema before adding Data controls
- Required properties are never removed
- Array structures maintain proper nesting
- Group children arrays are never empty
- Field references match schema exactly (case-sensitive)

**COMMON MISTAKES TO AVOID:**
- Using field names not in schema
- Missing required properties in control definitions
- Inconsistent naming conventions
- Breaking parent-child relationships in groups

## Decision Framework

**When adding fields, consider:**
1. Schema constraints (required, type, validation)
2. User workflow and logical grouping
3. Form length and complexity
4. Mobile/responsive considerations

**When organizing fields:**
- Group related fields together
- Place required fields prominently
- Consider conditional logic dependencies
- Maintain intuitive flow

## User Experience Guidelines

**Form Design Principles:**
- Progressive disclosure (show most important fields first)
- Logical grouping and clear section headers
- Appropriate field sizes and input types
- Clear validation messages and help text
- Consistent styling and spacing

**Accessibility Considerations:**
- Meaningful labels and titles
- Proper field associations
- Helpful placeholder text and descriptions
- Logical tab order through groups

{GetControlDefinitionDocumentation()}

## Guidelines for Form Manipulation

**Best Practices:**
- Always preserve existing valid form structures
- Add new fields in logical locations
- Use appropriate control types for data types
- Consider user experience and form flow
- Validate against schema before adding new fields

**Control Structure Integrity:**
- All Group controls must have non-empty children arrays
- Data controls must reference valid schema fields
- Action controls should have meaningful actionId values
- Maintain proper nesting for complex forms

**Data Types and Validation:**
- Text fields for string data
- Number fields for numeric data
- Date fields for temporal data
- Boolean fields for true/false values
- Follow consistent naming patterns
- Use appropriate data types in schema

## Response Requirements

**Always explain your reasoning:**
- Why you chose specific control types
- How you organized the form structure
- What schema constraints influenced decisions
- Any assumptions made about user intent

**Structure your response:**
1. Brief summary of changes
2. Explanation of key decisions
3. Any recommendations or alternatives considered

IMPORTANT: Always use the update_form_definition tool to make changes. Include the complete updated form definition, not just the changes.";
    }

    private object[] BuildMessages(ConversationMessage[] conversationHistory, string command)
    {
        var messages = new List<object>();

        foreach (var msg in conversationHistory)
        {
            messages.Add(new { role = msg.Role, content = msg.Content });
        }

        messages.Add(new { role = "user", content = command });

        return messages.ToArray();
    }

    private object[] GetFormTools()
    {
        return new object[]
        {
            new
            {
                name = "update_form_definition",
                description = "Update the form definition with new structure",
                input_schema = new
                {
                    type = "object",
                    properties = new
                    {
                        explanation = new
                        {
                            type = "string",
                            description = "Brief explanation of what changes were made"
                        },
                        form_definition = new
                        {
                            type = "array",
                            description = "The complete updated form definition as an array of control definitions",
                            items = new
                            {
                                type = "object",
                                description = "A control definition object"
                            }
                        }
                    },
                    required = new[] { "explanation", "form_definition" }
                }
            }
        };
    }

    private ProcessCommandResponse ProcessAnthropicResponse(object response)
    {
        try
        {
            var jsonElement = JsonSerializer.SerializeToElement(response);

            if (jsonElement.TryGetProperty("content", out var contentProperty) && contentProperty.ValueKind == JsonValueKind.Array)
            {
                var textContent = new List<string>();
                JsonElement? toolUse = null;

                foreach (var block in contentProperty.EnumerateArray())
                {
                    if (block.TryGetProperty("type", out var typeProperty))
                    {
                        var blockType = typeProperty.GetString();
                        if (blockType == "text" && block.TryGetProperty("text", out var textProperty))
                        {
                            textContent.Add(textProperty.GetString() ?? "");
                        }
                        else if (blockType == "tool_use" && block.TryGetProperty("name", out var nameProperty) && nameProperty.GetString() == "update_form_definition")
                        {
                            toolUse = block;
                        }
                    }
                }

                if (toolUse.HasValue && toolUse.Value.TryGetProperty("input", out var inputProperty))
                {
                    if (inputProperty.TryGetProperty("explanation", out var explanationProperty) &&
                        inputProperty.TryGetProperty("form_definition", out var formDefProperty))
                    {
                        return new ProcessCommandResponse
                        {
                            Response = explanationProperty.GetString() ?? "",
                            Success = true,
                            UpdatedFormDefinition = formDefProperty.EnumerateArray().ToArray()
                        };
                    }
                }

                return new ProcessCommandResponse
                {
                    Response = string.Join("\n", textContent),
                    Success = false
                };
            }

            return new ProcessCommandResponse
            {
                Response = "Unexpected response format from Claude",
                Success = false
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing Anthropic response");
            return new ProcessCommandResponse
            {
                Response = $"Error processing response: {ex.Message}",
                Success = false
            };
        }
    }


    private FormInfo ExtractFormInfo(JsonElement[] currentFormDefinition)
    {
        var fields = new List<string>();

        foreach (var definition in currentFormDefinition)
        {
            ExtractFieldsFromDefinition(definition, fields);
        }

        return new FormInfo
        {
            Fields = fields.ToArray()
        };
    }

    private void ExtractFieldsFromDefinition(JsonElement definition, List<string> fields)
    {
        if (definition.TryGetProperty("field", out var fieldProperty))
        {
            var fieldName = fieldProperty.GetString();
            if (!string.IsNullOrEmpty(fieldName))
            {
                fields.Add(fieldName);
            }
        }

        if (definition.TryGetProperty("children", out var childrenProperty) &&
            childrenProperty.ValueKind == JsonValueKind.Array)
        {
            foreach (var child in childrenProperty.EnumerateArray())
            {
                ExtractFieldsFromDefinition(child, fields);
            }
        }
    }

    private string GetControlDefinitionDocumentation()
    {
        return @"
## Core Control Types

**DataControlDefinition - Form Input Controls:**
{
  ""type"": ""Data"",
  ""field"": ""fieldName"",
  ""title"": ""Display Label"",
  ""required"": true/false,
  ""renderOptions"": { /* render type options */ }
}

**GroupedControlsDefinition - Container Controls:**
{
  ""type"": ""Group"",
  ""title"": ""Section Title"",
  ""children"": [ /* array of controls */ ]
}

**ActionControlDefinition - Interactive Buttons:**
{
  ""type"": ""Action"",
  ""title"": ""Button Text"",
  ""actionId"": ""actionName""
}

For detailed documentation, refer to the system prompt.";
    }

    private class FormInfo
    {
        public string[] Fields { get; set; } = Array.Empty<string>();
    }
}