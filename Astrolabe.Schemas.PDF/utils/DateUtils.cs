using System.Globalization;

namespace Astrolabe.Schemas.PDF.utils;

public static class DateUtils
{
    public static string DateStringToLocalDateString(
        this string dateTime,
        string inputFormat = "yyyy-MM-dd",
        string outputFormat = "dd/MM/yyyy"
    )
    {
        return DateTime.TryParseExact(
            dateTime,
            inputFormat,
            null,
            DateTimeStyles.None,
            out var parsedDate
        )
            ? parsedDate.ToString(outputFormat)
            : "Invalid Date";
    }
}
