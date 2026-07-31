using System.Text.Json;
using Astrolabe.Annotation;
using Astrolabe.JSON.Extensions;
using Xunit;

namespace Astrolabe.JSON.Tests;

[JsonString]
public enum TestRole
{
    View,
    Edit,
    Admin
}

public record TestUser(TestRole Role);

public class StringAttributeConverterTest
{
    private static JsonSerializerOptions Lenient() =>
        new JsonSerializerOptions().AddStandardOptions();

    private static JsonSerializerOptions Strict() =>
        new JsonSerializerOptions().AddStandardOptions(allowIntegerEnumValues: false);

    [Fact]
    public void ValidStringDeserializes()
    {
        var user = JsonSerializer.Deserialize<TestUser>("""{"role":"Edit"}""", Strict());
        Assert.Equal(new TestUser(TestRole.Edit), user);
    }

    [Fact]
    public void UnknownStringThrowsRegardlessOfStrictness()
    {
        Assert.Throws<JsonException>(() =>
            JsonSerializer.Deserialize<TestUser>("""{"role":"NotARole"}""", Lenient())
        );
        Assert.Throws<JsonException>(() =>
            JsonSerializer.Deserialize<TestUser>("""{"role":"NotARole"}""", Strict())
        );
    }

    [Fact]
    public void NumericValueAllowedByDefault()
    {
        var user = JsonSerializer.Deserialize<TestUser>("""{"role":999}""", Lenient());
        Assert.Equal((TestRole)999, user!.Role);
    }

    [Fact]
    public void NumericValueThrowsWhenStrict()
    {
        Assert.Throws<JsonException>(() =>
            JsonSerializer.Deserialize<TestUser>("""{"role":999}""", Strict())
        );
    }

    [Fact]
    public void NumericValueOfDefinedMemberAlsoThrowsWhenStrict()
    {
        Assert.Throws<JsonException>(() =>
            JsonSerializer.Deserialize<TestUser>("""{"role":0}""", Strict())
        );
    }

#if NET9_0_OR_GREATER
    // .NET 9 rewrote JsonStringEnumConverter so allowIntegerValues: false also rejects
    // digit-leading strings; on .NET 8 and earlier only JSON numbers are rejected.
    [Fact]
    public void NumericStringThrowsWhenStrict()
    {
        Assert.Throws<JsonException>(() =>
            JsonSerializer.Deserialize<TestUser>("""{"role":"999"}""", Strict())
        );
    }
#endif

    [Fact]
    public void SerializesAsMemberName()
    {
        Assert.Equal(
            """{"role":"Admin"}""",
            JsonSerializer.Serialize(new TestUser(TestRole.Admin), Strict())
        );
    }

    [Fact]
    public void SerializingUndefinedValueThrowsWhenStrict()
    {
        Assert.Throws<JsonException>(() =>
            JsonSerializer.Serialize(new TestUser((TestRole)999), Strict())
        );
    }
}
