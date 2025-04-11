using System.Globalization;
using System.Text;

namespace Astrolabe.Evaluator;

public static class StringUnescape
{
    /// <summary>
    /// Unescapes a JavaScript-style escaped string.
    /// Handles common escape sequences like \n, \t, \", \\, \x## (hex), \u#### (unicode),
    /// and \u{######} (extended unicode).
    /// </summary>
    /// <param name="str">The escaped string to unescape</param>
    /// <returns>The unescaped string</returns>
    public static string UnescapeJsString(string str)
    {
        if (string.IsNullOrEmpty(str))
            return str;

        StringBuilder result = new StringBuilder(str.Length);

        for (int i = 0; i < str.Length; i++)
        {
            // Check for escape sequence
            if (str[i] == '\\' && i + 1 < str.Length)
            {
                i++; // Skip the backslash
                char escapeChar = str[i];

                switch (escapeChar)
                {
                    // Common escapes
                    case 'n': result.Append('\n'); break; // newline
                    case 'r': result.Append('\r'); break; // carriage return
                    case 't': result.Append('\t'); break; // tab
                    case 'b': result.Append('\b'); break; // backspace
                    case 'f': result.Append('\f'); break; // form feed
                    case 'v': result.Append('\v'); break; // vertical tab
                    case '0': result.Append('\0'); break; // null character
                    case '\'': result.Append('\''); break; // single quote
                    case '"': result.Append('"'); break; // double quote
                    case '\\': result.Append('\\'); break; // backslash

                    // Unicode escape: \uXXXX
                    case 'u':
                        if (i + 1 < str.Length && str[i + 1] == '{')
                        {
                            // Extended unicode escape: \u{XXXXXX}
                            int closeBraceIndex = str.IndexOf('}', i + 2);
                            if (closeBraceIndex != -1)
                            {
                                string hexValue = str.Substring(i + 2, closeBraceIndex - (i + 2));
                                if (int.TryParse(hexValue, NumberStyles.HexNumber, null, out int codePoint))
                                {
                                    result.Append(char.ConvertFromUtf32(codePoint));
                                    i = closeBraceIndex;
                                }
                                else
                                {
                                    // Invalid hex, treat as literal
                                    result.Append('\\').Append(escapeChar).Append('{').Append(hexValue).Append('}');
                                    i = closeBraceIndex;
                                }
                            }
                            else
                            {
                                // Unclosed brace, treat as literal
                                result.Append('\\').Append(escapeChar);
                            }
                        }
                        else if (i + 4 < str.Length)
                        {
                            // Standard unicode escape: \uXXXX
                            string hexValue = str.Substring(i + 1, 4);
                            if (int.TryParse(hexValue, NumberStyles.HexNumber, null, out int charCode))
                            {
                                result.Append((char)charCode);
                                i += 4;
                            }
                            else
                            {
                                // Invalid hex, treat as literal
                                result.Append('\\').Append(escapeChar);
                            }
                        }
                        else
                        {
                            // Not enough characters, treat as literal
                            result.Append('\\').Append(escapeChar);
                        }
                        break;

                    // Hex escape: \xXX
                    case 'x':
                        if (i + 2 < str.Length)
                        {
                            string hexValue = str.Substring(i + 1, 2);
                            if (int.TryParse(hexValue, NumberStyles.HexNumber, null, out int charCode))
                            {
                                result.Append((char)charCode);
                                i += 2;
                            }
                            else
                            {
                                // Invalid hex, treat as literal
                                result.Append('\\').Append(escapeChar);
                            }
                        }
                        else
                        {
                            // Not enough characters, treat as literal
                            result.Append('\\').Append(escapeChar);
                        }
                        break;

                    // Octal escape: \NNN
                    default:
                        if (char.IsDigit(escapeChar) && escapeChar >= '0' && escapeChar <= '7')
                        {
                            // Collect up to 3 octal digits
                            string octalStr = escapeChar.ToString();
                            int digits = 1;

                            while (i + 1 < str.Length && digits < 3 &&
                                   char.IsDigit(str[i + 1]) && str[i + 1] >= '0' && str[i + 1] <= '7')
                            {
                                octalStr += str[++i];
                                digits++;
                            }

                            int octalValue = Convert.ToInt32(octalStr, 8);
                            result.Append((char)octalValue);
                        }
                        else
                        {
                            // Unknown escape, keep as-is
                            result.Append(escapeChar);
                        }
                        break;
                }
            }
            else
            {
                // Regular character
                result.Append(str[i]);
            }
        }

        return result.ToString();
    }
}