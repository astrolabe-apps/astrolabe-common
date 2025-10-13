namespace Astrolabe.Schemas.PDF.utils;

public static class ColourUtils
{
    public static string? ConvertHtmlHexToPdfHex(string htmlHex)
    {
        return htmlHex.Length switch
        {
            8 => htmlHex[6..] + htmlHex[..6],
            4 => htmlHex[3..] + htmlHex[..3],
            3 or 6 => htmlHex,
            _ => null
        };
    }
}
