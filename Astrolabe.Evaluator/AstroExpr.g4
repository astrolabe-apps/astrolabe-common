// $antlr-format alignTrailingComments true, columnLimit 150, minEmptyLines 1, maxEmptyLinesToKeep 1, reflowComments false, useTab false
// $antlr-format allowShortRulesOnASingleLine false, allowShortBlocksOnASingleLine true, alignSemicolons hanging, alignColons hanging

grammar AstroExpr;

main
    : expr EOF
    ;
    
expr
    : primaryExpr # Primary
    | ('-'|'!'|'+') expr # UnaryOp
    | expr '[' expr ']' # BinOp
    | expr '.' expr # BinOp
    | expr ('*'|'/'|'%') expr # BinOp
    | expr ('+'|'-') expr # BinOp
    | expr ('<' | '>' | '<=' | '>=') expr # BinOp
    | expr ('=' | '!=') expr # BinOp
    | expr 'and' expr # BinOp
    | expr 'or' expr # BinOp
    | expr '??' expr # BinOp
    | <assoc=right> expr '?' expr ':' expr # TernaryOp
    ; 
    
primaryExpr
    : functionCall 
    | arrayLiteral
    | objectLiteral
    | lambdaExpr
    | variableReference
    | '(' expr ')'
    | letExpr
    | Literal
    | Number
    | 'false'
    | 'true'
    | 'null'
    | Identifier
    ;

objectField
    : expr ':' expr
    ;

objectLiteral
    : '{' objectField? (',' objectField)* '}'
    ;
    
arrayLiteral
    : '[' (expr ( ',' expr)*)? ']'
    ;
    
functionCall
    : variableReference '(' (expr ( ',' expr)*)? ')'
    ;

variableAssign
    : variableReference ':=' expr
    ;

letExpr
    : 'let' (variableAssign (',' variableAssign)*) 'in' expr
    ;
    
lambdaExpr
    : variableReference '=>' expr
    ;

variableReference
    : '$' Identifier
    ;

Number
    : Digits ('.' Digits?)?
    | '.' Digits
    ;

fragment Digits
    : ('0' ..'9')+
    ;

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
NOT 
    : '!'
    ;
    
Literal
    : '"' ~'"'* '"'
    | '\'' ~'\''* '\''
    ;

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

