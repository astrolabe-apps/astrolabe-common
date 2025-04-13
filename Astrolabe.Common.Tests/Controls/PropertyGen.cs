using Astrolabe.Controls;
using FsCheck;

namespace Astrolabe.Common.Tests.Controls
{
    /// <summary>
    /// Generators for property-based testing, inspired by gen.ts
    /// </summary>
    public static class PropertyGen
    {
        /// <summary>
        /// Creates a generator for parent-child control combinations
        /// </summary>
        /// <returns>A generator for parent-child control tuples</returns>
        public static Arbitrary<(IControl Parent, IControl Child, string Path)> ArbitraryParentChild()
        {
            return Arb.From<(Dictionary<string, object>, string)>()
                .Filter(x => !string.IsNullOrEmpty(x.Item2))
                .Convert(
                    x => {
                        var parent = ControlFactory.Create(x.Item1);
                        var child = parent[x.Item2];
                        return (parent, child, x.Item2);
                    },
                    x => (new Dictionary<string, object>(), "")
                );
        }
        
        /// <summary>
        /// Creates a generator for control change operations
        /// </summary>
        /// <returns>A generator for control change operations</returns>
        public static Arbitrary<(ControlChange Change, Action<ControlContext, IControl> Trigger)> ArbitraryChangeAndTrigger()
        {
            var options = new List<(ControlChange Change, Action<ControlContext, IControl> Trigger)>
            {
                (ControlChange.Value, (ctx, ctrl) => _ = ctx.GetValue(ctrl)),
                (ControlChange.InitialValue, (ctx, ctrl) => _ = ctx.GetInitialValue(ctrl)),
                (ControlChange.Structure, (ctx, ctrl) => _ = ctx.IsNull(ctrl)),
                (ControlChange.Dirty, (ctx, ctrl) => _ = ctx.IsDirty(ctrl)),
                (ControlChange.Valid, (ctx, ctrl) => _ = ctx.IsValid(ctrl)),
                (ControlChange.Error, (ctx, ctrl) => _ = ctx.GetError(ctrl)),
                (ControlChange.Error, (ctx, ctrl) => _ = ctx.GetErrors(ctrl)),
                (ControlChange.Touched, (ctx, ctrl) => _ = ctx.IsTouched(ctrl)),
                (ControlChange.Disabled, (ctx, ctrl) => _ = ctx.IsDisabled(ctrl))
            };

            return Arb.From(Gen.Elements(options.ToArray()));
        }
        
        /// <summary>
        /// Creates a nested JSON structure for testing deep paths
        /// </summary>
        /// <returns>A generator for nested JSON objects and paths</returns>
        public static Arbitrary<(Dictionary<string, object> Json, List<string> Path)> ArbitraryJsonPath()
        {
            // Define a generator for JSON objects with a maximum nesting level
            Gen<(Dictionary<string, object> Json, List<string> Path)> GenJsonPath(int maxDepth, int currentDepth = 0)
            {
                // Base case: at maximum depth, create a leaf node
                if (currentDepth >= maxDepth) 
                {
                    return Gen.Fresh(() => {
                        var key = Guid.NewGuid().ToString("N").Substring(0, 5);
                        var value = Guid.NewGuid().ToString("N").Substring(0, 5);
                        return (new Dictionary<string, object> { [key] = value }, new List<string> { key });
                    });
                }
                
                // Recursive case: create an object or go deeper
                return Gen.Frequency(
                    new Tuple<int, Gen<(Dictionary<string, object>, List<string>)>>(
                        3,  // Higher probability to stop
                        Gen.Fresh(() => {
                            var key = Guid.NewGuid().ToString("N").Substring(0, 5);
                            var value = Guid.NewGuid().ToString("N").Substring(0, 5);
                            return (new Dictionary<string, object> { [key] = value }, new List<string> { key });
                        })
                    ),
                    new Tuple<int, Gen<(Dictionary<string, object>, List<string>)>>(
                        1,  // Lower probability to go deeper
                        GenJsonPath(maxDepth, currentDepth + 1).Select(childResult => {
                            var key = Guid.NewGuid().ToString("N").Substring(0, 5);
                            var outerObj = new Dictionary<string, object> { [key] = childResult.Json };
                            var path = new List<string> { key };
                            path.AddRange(childResult.Path);
                            return (outerObj, path);
                        })
                    )
                );
            }
            
            return Arb.From(GenJsonPath(3));  // Max depth of 3
        }
    }
}