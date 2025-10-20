// $antlr-format alignTrailingComments true, columnLimit 150, minEmptyLines 1, maxEmptyLinesToKeep 1, reflowComments false, useTab false
// $antlr-format allowShortRulesOnASingleLine false, allowShortBlocksOnASingleLine true, alignSemicolons hanging, alignColons hanging

parser grammar AstroExprParser;

options {
    tokenVocab = AstroExprLexer;
}

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
    | StringLiteral
    | templateStringLiteral
    | Number
    | 'false'
    | 'true'
    | 'null'
    | identifierName
    ;

objectField
    : expr ':' expr
    ;

objectLiteral
    : '{' objectField? (',' objectField)* RBRACE
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

identifierName
    : Identifier
    | 'and'
    | 'or'
    | 'true'
    | 'false'
    | 'null'
    | 'let'
    | 'in'
    ;

variableReference
    : '$' identifierName
    ;

templateStringLiteral
    : BackTick templateStringAtom* BackTick
    ;

templateStringAtom
    : TemplateStringAtom
    | TemplateStringStartExpression expr TemplateCloseBrace
    ;



