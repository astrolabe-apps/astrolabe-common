using QuestPDF.Fluent;
using QuestPDF.Infrastructure;

namespace Astrolabe.Schemas.PDF.common;

public static class Typography
{
    public static void Normal<T>(this T descriptor)
        where T : TextSpanDescriptor
    {
        descriptor.Style(Arial).Style(TextXs).Style(FontNormal);
    }

    #region Font Family

    public static readonly TextStyle Arial = TextStyle.Default.FontFamily("Arial");

    #endregion

    #region Font Size

    public static readonly TextStyle TextXs = TextStyle.Default.FontSize(12).LineHeight((float)16 / 12);
    public static readonly TextStyle TextSm =TextStyle.Default.FontSize(14).LineHeight((float)20 / 14);
    public static readonly TextStyle TextBase = TextStyle.Default.FontSize(16).LineHeight((float)24 / 16);
    public static readonly TextStyle TextLg = TextStyle.Default.FontSize(18).LineHeight((float)28 / 18);
    public static readonly TextStyle TextXl = TextStyle.Default.FontSize(20).LineHeight((float)28 / 20);
    public static readonly TextStyle Text2Xl = TextStyle.Default.FontSize(24).LineHeight((float)32 / 24);
    public static readonly TextStyle Text3Xl = TextStyle.Default.FontSize(30).LineHeight((float)36 / 30);
    public static readonly TextStyle Text4Xl = TextStyle.Default.FontSize(36).LineHeight((float)40 / 36);
    public static readonly TextStyle Text5Xl = TextStyle.Default.FontSize(48).LineHeight(1f);
    public static readonly TextStyle Text6Xl = TextStyle.Default.FontSize(60).LineHeight(1f);
    public static readonly TextStyle Text7Xl = TextStyle.Default.FontSize(72).LineHeight(1f);
    public static readonly TextStyle Text8Xl = TextStyle.Default.FontSize(96).LineHeight(1f);
    public static readonly TextStyle Text9Xl = TextStyle.Default.FontSize(128).LineHeight(1f);

    #endregion

    #region Font Style

    public static readonly TextStyle Italic = TextStyle.Default.Italic();
    public static readonly TextStyle NotItalic = TextStyle.Default.Italic(false);

    #endregion

    #region Font Weight

    public static readonly TextStyle FontThin = TextStyle.Default.Thin();
    public static readonly TextStyle FontExtraLight = TextStyle.Default.ExtraLight();
    public static readonly TextStyle FontLight = TextStyle.Default.Light();
    public static readonly TextStyle FontNormal = TextStyle.Default.NormalWeight();
    public static readonly TextStyle FontMedium = TextStyle.Default.Medium();
    public static readonly TextStyle FontSemiBold = TextStyle.Default.SemiBold();
    public static readonly TextStyle FontBold = TextStyle.Default.Bold();
    public static readonly TextStyle FontExtraBold = TextStyle.Default.ExtraBold();
    public static readonly TextStyle FontBlack = TextStyle.Default.Black();
    public static readonly TextStyle FontExtraBlack = TextStyle.Default.ExtraBlack();

    #endregion


    #region Text Decoration

    public static readonly TextStyle Underline = TextStyle.Default.Underline();
    public static readonly TextStyle Overline = TextStyle.Default.Overline();
    public static readonly TextStyle LineThrough = TextStyle.Default.Strikethrough();
    public static readonly TextStyle NoUnderline = TextStyle.Default.Underline(false);

    #endregion


    #region Text Decoration Style

    public static readonly TextStyle DecorationSolid = TextStyle.Default.DecorationSolid();
    public static readonly TextStyle DecorationDouble = TextStyle.Default.DecorationDouble();
    public static readonly TextStyle DecorationDotted = TextStyle.Default.DecorationDotted();
    public static readonly TextStyle DecorationDashed = TextStyle.Default.DecorationDashed();
    public static readonly TextStyle DecorationWavy = TextStyle.Default.DecorationWavy();

    #endregion
}
