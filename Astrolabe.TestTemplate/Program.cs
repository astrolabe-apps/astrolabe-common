using System.Reflection;
using Astrolabe.JSON.Extensions;
using Astrolabe.TestTemplate.Service;
using Astrolabe.TestTemplate.Workflow;
using Microsoft.AspNetCore.Mvc.Controllers;
using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi.Models;
using QuestPDF.Infrastructure;
using Swashbuckle.AspNetCore.SwaggerGen;

QuestPDF.Settings.License = LicenseType.Community;
var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

builder
    .Services.AddControllers()
    .AddJsonOptions(x =>
    {
        x.JsonSerializerOptions.AddStandardOptions();
    });

builder.Services.AddSingleton<CarService>();

// Configure Anthropic service with improved architecture
builder.Services.AddHttpClient<AnthropicService>(client =>
{
    var configuration = builder.Configuration;
    var apiKey = configuration["Anthropic:ApiKey"];

    if (string.IsNullOrEmpty(apiKey))
    {
        throw new InvalidOperationException("Anthropic API key is not configured. Please set Anthropic:ApiKey in configuration.");
    }

    var baseUrl = configuration["Anthropic:BaseUrl"] ?? "https://api.anthropic.com/v1/";
    client.BaseAddress = new Uri(baseUrl);
    client.DefaultRequestHeaders.Add("x-api-key", apiKey);
    client.DefaultRequestHeaders.Add("anthropic-version", "2023-06-01");
    client.DefaultRequestHeaders.Add("User-Agent", "Astrolabe-TestTemplate/1.0");
    client.Timeout = TimeSpan.FromMinutes(2); // Configure timeout for long-running AI requests
});

// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SupportNonNullableReferenceTypes();
    c.AddServer(new OpenApiServer() { Url = "https://localhost:5001" });
    c.CustomOperationIds(apiDesc =>
        apiDesc.TryGetMethodInfo(out var methodInfo)
            ? $"{((ControllerActionDescriptor)apiDesc.ActionDescriptor).ControllerName}_{methodInfo.Name}"
            : null
    );
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "My API", Version = "v1" });
    c.UseAllOfForInheritance();
    c.UseAllOfToExtendReferenceSchemas();
});

builder.Services.AddDbContext<AppDbContext>(op =>
    op.UseSqlServer(builder.Configuration.GetConnectionString("Default"))
);

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}
else
{
    app.UseHttpsRedirection();
}

app.UseRouting();
app.UseAuthorization();
app.UseEndpoints(e => e.MapControllers());
app.UseSpa(b => b.UseProxyToSpaDevelopmentServer("http://localhost:8000"));

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    try
    {
        await db.Database.MigrateAsync();
    }
    catch (Exception e)
    {
        Console.WriteLine($"Failed to migrate DB automatically: {e}");
    }
}

app.Run();
