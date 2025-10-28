lexer grammar AstroExprLexer;

options {
    superClass = AstroExprLexerBase;
}

Number
    : Digits ('.' Digits?)?
    | '.' Digits
    ;

fragment Digits
    : ('0' ..'9')+
    ;

LBRACE: '{';

TemplateCloseBrace         :     {this.IsInTemplateString()}? '}'
                                 {this.ProcessTemplateCloseBrace();} -> popMode;

RBRACE: '}';

DOLLAR: '$';

LAMBDA: '=>';

LPAR
    : '('
    ;

RPAR
    : ')'
    ;

LBRAC
    : '['
    ;

RBRAC
    : ']'
    ;

MINUS
    : '-'
    ;

PLUS
    : '+'
    ;

DOT
    : '.'
    ;

LineComment
    : '//' ~[\r\n]* -> skip
    ;

BlockComment
    : '/*' .*? '*/' -> skip
    ;

DIV: '/';

MOD: '%';

MUL
    : '*'
    ;


COMMA
    : ','
    ;


LESS
    : '<'
    ;

MORE_
    : '>'
    ;

LE
    : '<='
    ;

GE
    : '>='
    ;


APOS
    : '\''
    ;

QUOT
    : '"'
    ;

AND
    : 'and'
    ;

OR
    : 'or'
    ;
EQ
    : '='
    ;
NE
    : '!='
    ;

False
    : 'false'
    ;

True
    : 'true'
    ;

Null
    : 'null'
    ;

COND
    : '?'
    ;

IFNULL: '??';

ASSIGN: ':=';

LET: 'let';

IN: 'in';

ELSE
    : 'else'
    ;
NOT
    : '!'
    ;

COLON: ':';

Whitespace
    : (' ' | '\t' | '\n' | '\r')+ -> skip
    ;

fragment Letter
    : [a-zA-Z_]
    ;
fragment LetterOrDigit
    : Letter | [0-9];

Identifier
    : Letter LetterOrDigit*
    ;

StringLiteral:
    ('"' DoubleStringCharacter* '"' | '\'' SingleStringCharacter* '\'')
;

BackTick: '`' -> pushMode(TEMPLATE);


mode TEMPLATE;

BackTickInside                : '`' -> type(BackTick), popMode;
TemplateStringStartExpression : '{' {this.ProcessTemplateOpenBrace();} -> pushMode(DEFAULT_MODE);
TemplateStringAtom            : ~[`];

fragment DoubleStringCharacter: ~["\\\r\n] | '\\' EscapeSequence | LineContinuation;

fragment SingleStringCharacter: ~['\\\r\n] | '\\' EscapeSequence | LineContinuation;

fragment EscapeSequence:
    CharacterEscapeSequence
    | '0' // no digit ahead! TODO
    | HexEscapeSequence
    | UnicodeEscapeSequence
    | ExtendedUnicodeEscapeSequence
;

fragment CharacterEscapeSequence: SingleEscapeCharacter | NonEscapeCharacter;

fragment HexEscapeSequence: 'x' HexDigit HexDigit;

fragment UnicodeEscapeSequence:
    'u' HexDigit HexDigit HexDigit HexDigit
    | 'u' '{' HexDigit HexDigit+ '}'
;

fragment ExtendedUnicodeEscapeSequence: 'u' '{' HexDigit+ '}';

fragment SingleEscapeCharacter: ['"\\bfnrtv];

fragment NonEscapeCharacter: ~['"\\bfnrtv0-9xu\r\n];

fragment EscapeCharacter: SingleEscapeCharacter | [0-9] | [xu];

fragment LineContinuation: '\\' [\r\n\u2028\u2029]+;

fragment HexDigit: [_0-9a-fA-F];

fragment DecimalIntegerLiteral: '0' | [1-9] [0-9_]*;

fragment ExponentPart: [eE] [+-]? [0-9_]+;

fragment IdentifierPart: IdentifierStart | [\p{Mn}] | [\p{Nd}] | [\p{Pc}] | '\u200C' | '\u200D';

fragment IdentifierStart: [\p{L}] | [$_] | '\\' UnicodeEscapeSequence;

fragment RegularExpressionFirstChar:
    ~[*\r\n\u2028\u2029\\/[]
    | RegularExpressionBackslashSequence
    | '[' RegularExpressionClassChar* ']'
;

fragment RegularExpressionChar:
    ~[\r\n\u2028\u2029\\/[]
    | RegularExpressionBackslashSequence
    | '[' RegularExpressionClassChar* ']'
;

fragment RegularExpressionClassChar: ~[\r\n\u2028\u2029\]\\] | RegularExpressionBackslashSequence;

fragment RegularExpressionBackslashSequence: '\\' ~[\r\n\u2028\u2029];

