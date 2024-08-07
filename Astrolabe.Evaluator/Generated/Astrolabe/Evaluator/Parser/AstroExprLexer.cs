//------------------------------------------------------------------------------
// <auto-generated>
//     This code was generated by a tool.
//     ANTLR Version: 4.13.1
//
//     Changes to this file may cause incorrect behavior and will be lost if
//     the code is regenerated.
// </auto-generated>
//------------------------------------------------------------------------------

// Generated from /home/doolse/astrolabe/astrolabe-common/Astrolabe.Evaluator/AstroExpr.g4 by ANTLR 4.13.1

// Unreachable code detected
#pragma warning disable 0162
// The variable '...' is assigned but its value is never used
#pragma warning disable 0219
// Missing XML comment for publicly visible type or member '...'
#pragma warning disable 1591
// Ambiguous reference in cref attribute
#pragma warning disable 419

namespace Astrolabe.Evaluator.Parser {
using System;
using System.IO;
using System.Text;
using Antlr4.Runtime;
using Antlr4.Runtime.Atn;
using Antlr4.Runtime.Misc;
using DFA = Antlr4.Runtime.Dfa.DFA;

[System.CodeDom.Compiler.GeneratedCode("ANTLR", "4.13.1")]
[System.CLSCompliant(false)]
public partial class AstroExprLexer : Lexer {
	protected static DFA[] decisionToDFA;
	protected static PredictionContextCache sharedContextCache = new PredictionContextCache();
	public const int
		T__0=1, T__1=2, T__2=3, T__3=4, T__4=5, T__5=6, T__6=7, Number=8, LPAR=9, 
		RPAR=10, LBRAC=11, RBRAC=12, MINUS=13, PLUS=14, DOT=15, MUL=16, COMMA=17, 
		LESS=18, MORE_=19, LE=20, GE=21, APOS=22, QUOT=23, AND=24, OR=25, EQ=26, 
		NE=27, False=28, True=29, Null=30, COND=31, NOT=32, Literal=33, Whitespace=34, 
		Identifier=35;
	public static string[] channelNames = {
		"DEFAULT_TOKEN_CHANNEL", "HIDDEN"
	};

	public static string[] modeNames = {
		"DEFAULT_MODE"
	};

	public static readonly string[] ruleNames = {
		"T__0", "T__1", "T__2", "T__3", "T__4", "T__5", "T__6", "Number", "Digits", 
		"LPAR", "RPAR", "LBRAC", "RBRAC", "MINUS", "PLUS", "DOT", "MUL", "COMMA", 
		"LESS", "MORE_", "LE", "GE", "APOS", "QUOT", "AND", "OR", "EQ", "NE", 
		"False", "True", "Null", "COND", "NOT", "Literal", "Whitespace", "Letter", 
		"LetterOrDigit", "Identifier"
	};


	public AstroExprLexer(ICharStream input)
	: this(input, Console.Out, Console.Error) { }

	public AstroExprLexer(ICharStream input, TextWriter output, TextWriter errorOutput)
	: base(input, output, errorOutput)
	{
		Interpreter = new LexerATNSimulator(this, _ATN, decisionToDFA, sharedContextCache);
	}

	private static readonly string[] _LiteralNames = {
		null, "':='", "'let'", "'in'", "'=>'", "':'", "'/'", "'$'", null, "'('", 
		"')'", "'['", "']'", "'-'", "'+'", "'.'", "'*'", "','", "'<'", "'>'", 
		"'<='", "'>='", "'''", "'\"'", "'and'", "'or'", "'='", "'!='", "'false'", 
		"'true'", "'null'", "'?'", "'!'"
	};
	private static readonly string[] _SymbolicNames = {
		null, null, null, null, null, null, null, null, "Number", "LPAR", "RPAR", 
		"LBRAC", "RBRAC", "MINUS", "PLUS", "DOT", "MUL", "COMMA", "LESS", "MORE_", 
		"LE", "GE", "APOS", "QUOT", "AND", "OR", "EQ", "NE", "False", "True", 
		"Null", "COND", "NOT", "Literal", "Whitespace", "Identifier"
	};
	public static readonly IVocabulary DefaultVocabulary = new Vocabulary(_LiteralNames, _SymbolicNames);

	[NotNull]
	public override IVocabulary Vocabulary
	{
		get
		{
			return DefaultVocabulary;
		}
	}

	public override string GrammarFileName { get { return "AstroExpr.g4"; } }

	public override string[] RuleNames { get { return ruleNames; } }

	public override string[] ChannelNames { get { return channelNames; } }

	public override string[] ModeNames { get { return modeNames; } }

	public override int[] SerializedAtn { get { return _serializedATN; } }

	static AstroExprLexer() {
		decisionToDFA = new DFA[_ATN.NumberOfDecisions];
		for (int i = 0; i < _ATN.NumberOfDecisions; i++) {
			decisionToDFA[i] = new DFA(_ATN.GetDecisionState(i), i);
		}
	}
	private static int[] _serializedATN = {
		4,0,35,214,6,-1,2,0,7,0,2,1,7,1,2,2,7,2,2,3,7,3,2,4,7,4,2,5,7,5,2,6,7,
		6,2,7,7,7,2,8,7,8,2,9,7,9,2,10,7,10,2,11,7,11,2,12,7,12,2,13,7,13,2,14,
		7,14,2,15,7,15,2,16,7,16,2,17,7,17,2,18,7,18,2,19,7,19,2,20,7,20,2,21,
		7,21,2,22,7,22,2,23,7,23,2,24,7,24,2,25,7,25,2,26,7,26,2,27,7,27,2,28,
		7,28,2,29,7,29,2,30,7,30,2,31,7,31,2,32,7,32,2,33,7,33,2,34,7,34,2,35,
		7,35,2,36,7,36,2,37,7,37,1,0,1,0,1,0,1,1,1,1,1,1,1,1,1,2,1,2,1,2,1,3,1,
		3,1,3,1,4,1,4,1,5,1,5,1,6,1,6,1,7,1,7,1,7,3,7,100,8,7,3,7,102,8,7,1,7,
		1,7,3,7,106,8,7,1,8,4,8,109,8,8,11,8,12,8,110,1,9,1,9,1,10,1,10,1,11,1,
		11,1,12,1,12,1,13,1,13,1,14,1,14,1,15,1,15,1,16,1,16,1,17,1,17,1,18,1,
		18,1,19,1,19,1,20,1,20,1,20,1,21,1,21,1,21,1,22,1,22,1,23,1,23,1,24,1,
		24,1,24,1,24,1,25,1,25,1,25,1,26,1,26,1,27,1,27,1,27,1,28,1,28,1,28,1,
		28,1,28,1,28,1,29,1,29,1,29,1,29,1,29,1,30,1,30,1,30,1,30,1,30,1,31,1,
		31,1,32,1,32,1,33,1,33,5,33,179,8,33,10,33,12,33,182,9,33,1,33,1,33,1,
		33,5,33,187,8,33,10,33,12,33,190,9,33,1,33,3,33,193,8,33,1,34,4,34,196,
		8,34,11,34,12,34,197,1,34,1,34,1,35,1,35,1,36,1,36,3,36,206,8,36,1,37,
		1,37,5,37,210,8,37,10,37,12,37,213,9,37,0,0,38,1,1,3,2,5,3,7,4,9,5,11,
		6,13,7,15,8,17,0,19,9,21,10,23,11,25,12,27,13,29,14,31,15,33,16,35,17,
		37,18,39,19,41,20,43,21,45,22,47,23,49,24,51,25,53,26,55,27,57,28,59,29,
		61,30,63,31,65,32,67,33,69,34,71,0,73,0,75,35,1,0,5,1,0,34,34,1,0,39,39,
		3,0,9,10,13,13,32,32,3,0,65,90,95,95,97,122,1,0,48,57,220,0,1,1,0,0,0,
		0,3,1,0,0,0,0,5,1,0,0,0,0,7,1,0,0,0,0,9,1,0,0,0,0,11,1,0,0,0,0,13,1,0,
		0,0,0,15,1,0,0,0,0,19,1,0,0,0,0,21,1,0,0,0,0,23,1,0,0,0,0,25,1,0,0,0,0,
		27,1,0,0,0,0,29,1,0,0,0,0,31,1,0,0,0,0,33,1,0,0,0,0,35,1,0,0,0,0,37,1,
		0,0,0,0,39,1,0,0,0,0,41,1,0,0,0,0,43,1,0,0,0,0,45,1,0,0,0,0,47,1,0,0,0,
		0,49,1,0,0,0,0,51,1,0,0,0,0,53,1,0,0,0,0,55,1,0,0,0,0,57,1,0,0,0,0,59,
		1,0,0,0,0,61,1,0,0,0,0,63,1,0,0,0,0,65,1,0,0,0,0,67,1,0,0,0,0,69,1,0,0,
		0,0,75,1,0,0,0,1,77,1,0,0,0,3,80,1,0,0,0,5,84,1,0,0,0,7,87,1,0,0,0,9,90,
		1,0,0,0,11,92,1,0,0,0,13,94,1,0,0,0,15,105,1,0,0,0,17,108,1,0,0,0,19,112,
		1,0,0,0,21,114,1,0,0,0,23,116,1,0,0,0,25,118,1,0,0,0,27,120,1,0,0,0,29,
		122,1,0,0,0,31,124,1,0,0,0,33,126,1,0,0,0,35,128,1,0,0,0,37,130,1,0,0,
		0,39,132,1,0,0,0,41,134,1,0,0,0,43,137,1,0,0,0,45,140,1,0,0,0,47,142,1,
		0,0,0,49,144,1,0,0,0,51,148,1,0,0,0,53,151,1,0,0,0,55,153,1,0,0,0,57,156,
		1,0,0,0,59,162,1,0,0,0,61,167,1,0,0,0,63,172,1,0,0,0,65,174,1,0,0,0,67,
		192,1,0,0,0,69,195,1,0,0,0,71,201,1,0,0,0,73,205,1,0,0,0,75,207,1,0,0,
		0,77,78,5,58,0,0,78,79,5,61,0,0,79,2,1,0,0,0,80,81,5,108,0,0,81,82,5,101,
		0,0,82,83,5,116,0,0,83,4,1,0,0,0,84,85,5,105,0,0,85,86,5,110,0,0,86,6,
		1,0,0,0,87,88,5,61,0,0,88,89,5,62,0,0,89,8,1,0,0,0,90,91,5,58,0,0,91,10,
		1,0,0,0,92,93,5,47,0,0,93,12,1,0,0,0,94,95,5,36,0,0,95,14,1,0,0,0,96,101,
		3,17,8,0,97,99,5,46,0,0,98,100,3,17,8,0,99,98,1,0,0,0,99,100,1,0,0,0,100,
		102,1,0,0,0,101,97,1,0,0,0,101,102,1,0,0,0,102,106,1,0,0,0,103,104,5,46,
		0,0,104,106,3,17,8,0,105,96,1,0,0,0,105,103,1,0,0,0,106,16,1,0,0,0,107,
		109,2,48,57,0,108,107,1,0,0,0,109,110,1,0,0,0,110,108,1,0,0,0,110,111,
		1,0,0,0,111,18,1,0,0,0,112,113,5,40,0,0,113,20,1,0,0,0,114,115,5,41,0,
		0,115,22,1,0,0,0,116,117,5,91,0,0,117,24,1,0,0,0,118,119,5,93,0,0,119,
		26,1,0,0,0,120,121,5,45,0,0,121,28,1,0,0,0,122,123,5,43,0,0,123,30,1,0,
		0,0,124,125,5,46,0,0,125,32,1,0,0,0,126,127,5,42,0,0,127,34,1,0,0,0,128,
		129,5,44,0,0,129,36,1,0,0,0,130,131,5,60,0,0,131,38,1,0,0,0,132,133,5,
		62,0,0,133,40,1,0,0,0,134,135,5,60,0,0,135,136,5,61,0,0,136,42,1,0,0,0,
		137,138,5,62,0,0,138,139,5,61,0,0,139,44,1,0,0,0,140,141,5,39,0,0,141,
		46,1,0,0,0,142,143,5,34,0,0,143,48,1,0,0,0,144,145,5,97,0,0,145,146,5,
		110,0,0,146,147,5,100,0,0,147,50,1,0,0,0,148,149,5,111,0,0,149,150,5,114,
		0,0,150,52,1,0,0,0,151,152,5,61,0,0,152,54,1,0,0,0,153,154,5,33,0,0,154,
		155,5,61,0,0,155,56,1,0,0,0,156,157,5,102,0,0,157,158,5,97,0,0,158,159,
		5,108,0,0,159,160,5,115,0,0,160,161,5,101,0,0,161,58,1,0,0,0,162,163,5,
		116,0,0,163,164,5,114,0,0,164,165,5,117,0,0,165,166,5,101,0,0,166,60,1,
		0,0,0,167,168,5,110,0,0,168,169,5,117,0,0,169,170,5,108,0,0,170,171,5,
		108,0,0,171,62,1,0,0,0,172,173,5,63,0,0,173,64,1,0,0,0,174,175,5,33,0,
		0,175,66,1,0,0,0,176,180,5,34,0,0,177,179,8,0,0,0,178,177,1,0,0,0,179,
		182,1,0,0,0,180,178,1,0,0,0,180,181,1,0,0,0,181,183,1,0,0,0,182,180,1,
		0,0,0,183,193,5,34,0,0,184,188,5,39,0,0,185,187,8,1,0,0,186,185,1,0,0,
		0,187,190,1,0,0,0,188,186,1,0,0,0,188,189,1,0,0,0,189,191,1,0,0,0,190,
		188,1,0,0,0,191,193,5,39,0,0,192,176,1,0,0,0,192,184,1,0,0,0,193,68,1,
		0,0,0,194,196,7,2,0,0,195,194,1,0,0,0,196,197,1,0,0,0,197,195,1,0,0,0,
		197,198,1,0,0,0,198,199,1,0,0,0,199,200,6,34,0,0,200,70,1,0,0,0,201,202,
		7,3,0,0,202,72,1,0,0,0,203,206,3,71,35,0,204,206,7,4,0,0,205,203,1,0,0,
		0,205,204,1,0,0,0,206,74,1,0,0,0,207,211,3,71,35,0,208,210,3,73,36,0,209,
		208,1,0,0,0,210,213,1,0,0,0,211,209,1,0,0,0,211,212,1,0,0,0,212,76,1,0,
		0,0,213,211,1,0,0,0,11,0,99,101,105,110,180,188,192,197,205,211,1,6,0,
		0
	};

	public static readonly ATN _ATN =
		new ATNDeserializer().Deserialize(_serializedATN);


}
} // namespace Astrolabe.Evaluator.Parser
