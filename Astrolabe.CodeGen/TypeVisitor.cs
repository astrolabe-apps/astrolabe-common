using System.Collections;
using System.Reflection;
using Namotion.Reflection;

namespace Astrolabe.CodeGen;

public abstract class TypeVisitor<T>
{
    private Dictionary<(Type, bool), T> _visited = new();

    protected HashSet<Type> _primitives =
        new()
        {
            typeof(string),
            typeof(Guid),
            typeof(DateTime),
            typeof(DateTimeOffset),
            typeof(DateOnly),
            typeof(TimeOnly),
            typeof(bool),
            typeof(long),
            typeof(object),
            typeof(int),
            typeof(short),
            typeof(ushort),
            typeof(uint),
            typeof(ulong)
        };

    public T VisitType(ContextualType ctype)
    {
        var nullable = ctype.Nullability == Nullability.Nullable;
        var type = ctype.Type;
        if (_visited.TryGetValue((type, nullable), out var value))
        {
            return value;
        }

        if (IsPrimitive(type))
            return Add(VisitPrimitive(type, nullable));

        if (IsEnumerable(type))
        {
            var elemType = type.GetElementType();
            return Add(
                VisitEnumerable(
                    type,
                    nullable,
                    () =>
                    {
                        if (elemType != null)
                            return VisitType(elemType.ToContextualType());
                        if (ctype.GenericArguments.Length != 1)
                        {
                            throw new Exception("Unknown enumerable: " + ctype);
                        }
                        return VisitType(ctype.GenericArguments[0]);
                    }
                )
            );
        }

        List<FlattenedProperty> allMembers;
        if (type.IsGenericType)
        {
            allMembers = type.GetProperties()
                .Select(p => new FlattenedProperty(p.Name, p, type))
                .ToList();
        }
        else
        {
            allMembers = type
                .Assembly.GetTypes()
                .Where(x => x.BaseType == type || x == type)
                .SelectMany(x => x.GetProperties().Select(p => new FlattenedProperty(p.Name, p, x)))
                .ToList();
        }

        var onlyForTypeLookup = allMembers.ToLookup(x => x.Name);

        var members = onlyForTypeLookup
            .Select(x =>
            {
                var fieldName = x.Key;
                var firstProp = x.First();
                var firstPropInfo = firstProp.Info;
                var firstCType = firstPropInfo.ToContextualProperty();
                var contextualType = firstCType.PropertyType;
                return new TypeMember<T>(
                    fieldName,
                    x.Select(p => p.Info),
                    contextualType.Type,
                    () => VisitType(contextualType)
                );
            })
            .ToList();

        return Add(VisitObject(type, nullable, members));

        T Add(T t)
        {
            _visited.Add((type, nullable), t);
            return t;
        }
    }

    protected abstract T VisitEnumerable(Type type, bool nullable, Func<T> elemData);

    protected abstract T VisitPrimitive(Type type, bool nullable);

    protected abstract T VisitObject(Type type, bool nullable, IEnumerable<TypeMember<T>> members);

    protected bool IsPrimitive(Type type)
    {
        return type.IsEnum
            || type.IsPrimitive
            || _primitives.Contains(type)
            || (
                type.IsGenericType
                && typeof(IDictionary<,>).IsAssignableFrom(type.GetGenericTypeDefinition())
            );
    }

    protected bool IsEnumerable(Type type)
    {
        return typeof(IEnumerable).IsAssignableFrom(type);
    }
}

public record TypeMember<T>(
    string FieldName,
    IEnumerable<PropertyInfo> Properties,
    Type Type,
    Func<T> Data
) { }

public record FlattenedProperty(string Name, PropertyInfo Info, Type Type);
