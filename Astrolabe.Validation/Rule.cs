using System.Collections.Immutable;
using System.Numerics;
using Astrolabe.Annotation;
using Astrolabe.Evaluator;

namespace Astrolabe.Validation;

public enum RuleType
{
    Single,
    Multi,
    ForEach
}

public abstract record Rule(RuleType Type);

public record SingleRule(EvalExpr Path, EvalExpr Props, EvalExpr Must) : Rule(RuleType.Single)
{
    public SingleRule WithProp(EvalExpr key, EvalExpr value)
    {
        return this with { Props = new CallExpr("WithProperty", [key, value, Props]) };
    }

    public SingleRule AndMust(EvalExpr andMust)
    {
        return this with { Must = new CallExpr("and", [Must, andMust]) };
    }

    public SingleRule When(EvalExpr whenExpr)
    {
        return this with { Must = new CallExpr("?", [whenExpr, Must, ValueExpr.Null,]) };
    }

    public SingleRule WithMessage(EvalExpr message)
    {
        return this with { Must = new CallExpr("WithMessage", [message, Must]) };
    }
}

public record MultiRule(IEnumerable<Rule> Rules) : Rule(RuleType.Multi)
{
    public static MultiRule For(params Rule[] rules)
    {
        return new MultiRule(rules);
    }

    public static Rule Concat(Rule rule1, Rule rule2)
    {
        return new MultiRule(rule1.GetRules().Concat(rule2.GetRules()));
    }
}

public record ForEachRule(EvalExpr Path, VarExpr Index, LetExpr? Variables, Rule Rule)
    : Rule(RuleType.ForEach)
{
    public ForEachRule AddRule(Rule rule)
    {
        return this with { Rule = MultiRule.Concat(Rule, rule) };
    }
}

public static class RuleExtensions
{
    public static IEnumerable<Rule> GetRules(this Rule rule)
    {
        return rule switch
        {
            MultiRule multiRule => multiRule.Rules,
            _ => [rule]
        };
    }

    // public static List<DataPath> GetDataOrder(this IEnumerable<ResolvedRule> rules)
    // {
    //     var dataOrder = new List<DataPath>();
    //     var processed = new HashSet<DataPath>();
    //
    //     var ruleList = rules.ToList();
    //     var ruleLookup = ruleList.ToLookup(x => x.Path);
    //     ruleLookup.ToList().ForEach(x => AddRules(x.Key, x));
    //     return dataOrder;
    //
    //     void AddRules(DataPath path, IEnumerable<ResolvedRule> pathRules)
    //     {
    //         if (!processed.Add(path))
    //             return;
    //         pathRules.ToList().ForEach(x => AddExprPaths(x.Must));
    //         dataOrder.Add(path);
    //     }
    //
    //     void AddPath(DataPath path)
    //     {
    //         if (!processed.Contains(path))
    //         {
    //             dataOrder.Add(path);
    //         }
    //     }
    //
    //     void AddExprPaths(EvalExpr e)
    //     {
    //         switch (e)
    //         {
    //             case PathExpr { Path: var fp }:
    //                 AddRules(fp, ruleLookup[fp]);
    //                 break;
    //             case CallExpr { Args: var args }:
    //                 foreach (var expr in args)
    //                 {
    //                     AddExprPaths(expr);
    //                 }
    //                 break;
    //         }
    //     }
    // }
}
