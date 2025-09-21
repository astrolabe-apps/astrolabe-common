using System.Text.Json;

namespace Astrolabe.TestTemplate.Models;

public class ProcessCommandRequest
{
    public string Command { get; set; } = string.Empty;
    public JsonElement[] CurrentFormDefinition { get; set; } = Array.Empty<JsonElement>();
    public JsonElement[] Schema { get; set; } = Array.Empty<JsonElement>();
    public ConversationMessage[] ConversationHistory { get; set; } = Array.Empty<ConversationMessage>();
    public string? SystemPrompt { get; set; }
}

public class ConversationMessage
{
    public string Role { get; set; } = string.Empty; // "user" | "assistant"
    public string Content { get; set; } = string.Empty;
}

public class ProcessCommandResponse
{
    public string Response { get; set; } = string.Empty;
    public bool Success { get; set; }
    public JsonElement[]? UpdatedFormDefinition { get; set; }
}

public class StreamChunk
{
    public string Type { get; set; } = string.Empty; // "chunk" | "tool_use" | "complete" | "error"
    public string Content { get; set; } = string.Empty;
    public object? ToolCall { get; set; }
    public string? Error { get; set; }
}