// See https://aka.ms/new-console-template for more information

using System.Text.Json;
using Astrolabe.Controls;

var main = ControlFactory.Create(new Dictionary<string, object?> {{"key", "value"}});

var ctx = ControlContext.Create();
ctx.SetValue(main["key"], "newValue");
ctx.SetValue(main["newkey"], null);
Console.WriteLine(JsonSerializer.Serialize(main.Value));
Console.WriteLine(JsonSerializer.Serialize(main.InitialValue));