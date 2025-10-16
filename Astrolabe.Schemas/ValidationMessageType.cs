namespace Astrolabe.Schemas;

/// <summary>
/// Types of validation messages for generating user-facing error text.
/// </summary>
public enum ValidationMessageType
{
    /// <summary>
    /// Field is required but has no value.
    /// </summary>
    NotEmpty,

    /// <summary>
    /// Value length is less than minimum required.
    /// </summary>
    MinLength,

    /// <summary>
    /// Value length exceeds maximum allowed.
    /// </summary>
    MaxLength,

    /// <summary>
    /// Date is after the maximum allowed date.
    /// </summary>
    NotAfterDate,

    /// <summary>
    /// Date is before the minimum allowed date.
    /// </summary>
    NotBeforeDate
}
