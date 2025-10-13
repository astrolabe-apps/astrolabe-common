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

    public static TextStyle Arial => TextStyle.Default.FontFamily("Arial");

    #endregion

    #region Font Size

    public static TextStyle TextXs => TextStyle.Default.FontSize(12).LineHeight((float)16 / 12);
    public static TextStyle TextSm => TextStyle.Default.FontSize(14).LineHeight((float)20 / 14);
    public static TextStyle TextBase => TextStyle.Default.FontSize(16).LineHeight((float)24 / 16);
    public static TextStyle TextLg => TextStyle.Default.FontSize(18).LineHeight((float)28 / 18);
    public static TextStyle TextXl => TextStyle.Default.FontSize(20).LineHeight((float)28 / 20);
    public static TextStyle Text2Xl => TextStyle.Default.FontSize(24).LineHeight((float)32 / 24);
    public static TextStyle Text3Xl => TextStyle.Default.FontSize(30).LineHeight((float)36 / 30);
    public static TextStyle Text4Xl => TextStyle.Default.FontSize(36).LineHeight((float)40 / 36);
    public static TextStyle Text5Xl => TextStyle.Default.FontSize(48).LineHeight(1f);
    public static TextStyle Text6Xl => TextStyle.Default.FontSize(60).LineHeight(1f);
    public static TextStyle Text7Xl => TextStyle.Default.FontSize(72).LineHeight(1f);
    public static TextStyle Text8Xl => TextStyle.Default.FontSize(96).LineHeight(1f);
    public static TextStyle Text9Xl => TextStyle.Default.FontSize(128).LineHeight(1f);

    #endregion

    #region Font Style

    public static TextStyle Italic => TextStyle.Default.Italic();
    public static TextStyle NotItalic => TextStyle.Default.Italic(false);

    #endregion

    #region Font Weight

    public static TextStyle FontThin => TextStyle.Default.Thin();
    public static TextStyle FontExtraLight => TextStyle.Default.ExtraLight();
    public static TextStyle FontLight => TextStyle.Default.Light();
    public static TextStyle FontNormal => TextStyle.Default.NormalWeight();
    public static TextStyle FontMedium => TextStyle.Default.Medium();
    public static TextStyle FontSemiBold => TextStyle.Default.SemiBold();
    public static TextStyle FontBold => TextStyle.Default.Bold();
    public static TextStyle FontExtraBold => TextStyle.Default.ExtraBold();
    public static TextStyle FontBlack => TextStyle.Default.Black();
    public static TextStyle FontExtraBlack => TextStyle.Default.ExtraBlack();

    #endregion

    #region Text Decoration

    public static TextStyle Underline => TextStyle.Default.Underline();
    public static TextStyle Overline => TextStyle.Default.Overline();
    public static TextStyle LineThrough => TextStyle.Default.Strikethrough();
    public static TextStyle NoUnderline => TextStyle.Default.Underline(false);

    #endregion

    #region Text Decoration Style

    public static TextStyle DecorationSolid => TextStyle.Default.DecorationSolid();
    public static TextStyle DecorationDouble => TextStyle.Default.DecorationDouble();
    public static TextStyle DecorationDotted => TextStyle.Default.DecorationDotted();
    public static TextStyle DecorationDashed => TextStyle.Default.DecorationDashed();
    public static TextStyle DecorationWavy => TextStyle.Default.DecorationWavy();

    #endregion
}
