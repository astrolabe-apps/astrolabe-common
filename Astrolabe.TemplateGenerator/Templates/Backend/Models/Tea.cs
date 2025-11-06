using Astrolabe.Annotation;
using Microsoft.EntityFrameworkCore;

namespace __AppName__.Models;

public class Tea
{
    public Guid Id { get; set; }
    public TeaType Type { get; set; }
    public int NumberOfSugars { get; set; }
    public MilkAmount MilkAmount { get; set; }
    public bool IncludeSpoon { get; set; }
    public string? BrewNotes { get; set; }
}

[JsonString]
public enum TeaType
{
    Black,
    Green,
    Oolong,
    White,
    Herbal,
    Rooibos,
    Purple,
    Peppermint,
}

[JsonString]
public enum MilkAmount
{
    None,
    Splash,
    Normal,
    Extra,
}
