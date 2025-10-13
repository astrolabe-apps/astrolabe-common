using QuestPDF.Fluent;
using QuestPDF.Infrastructure;
using static Astrolabe.Schemas.PDF.common.Typography;

namespace Astrolabe.Schemas.PDF;

public static class PdfStyleParser
{
    public static void WithStyles(this TextSpanDescriptor descriptor, string[] classNames)
    {
        descriptor.Normal();

        foreach (var className in classNames)
        {
            descriptor.RunTypographyParser(className);
        }
    }
}
