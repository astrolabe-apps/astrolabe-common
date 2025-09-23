namespace Astrolabe.Controls;

[Flags]
public enum ControlChange
{
    None = 0,
    Valid = 1,
    Touched = 2,
    Dirty = 4,
    Disabled = 8,
    Value = 16,
    InitialValue = 32,
    Error = 64,
    All = Value | Valid | Touched | Disabled | Error | Dirty | InitialValue,
    Structure = 128,
    Validate = 256
}