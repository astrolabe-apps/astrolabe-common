using System.Reflection;
using Astrolabe.JSON.Extensions;
using __AppName__.Data.EF;
using __AppName__.Exceptions;
using __AppName__.Models;
using __AppName__.Services;
using Microsoft.AspNetCore.Mvc.Controllers;
using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi.Models;
using Swashbuckle.AspNetCore.SwaggerGen;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddSingleton<FormService>();

// Add exception handling
builder.Services.AddExceptionHandler<ExceptionHandler>();
builder.Services.AddProblemDetails();

// Add services to the container.
builder
    .Services.AddControllers()
    .AddJsonOptions(x =>
    {
        x.JsonSerializerOptions.AddStandardOptions();
    });

// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SupportNonNullableReferenceTypes();
    c.AddServer(new OpenApiServer() { Url = "https://localhost:__HttpsPort__" });
    c.CustomOperationIds(apiDesc =>
        apiDesc.TryGetMethodInfo(out var methodInfo)
            ? $"{((ControllerActionDescriptor)apiDesc.ActionDescriptor).ControllerName}_{methodInfo.Name}"
            : null
    );
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "__AppName__ API", Version = "v1" });
    c.UseAllOfForInheritance();
    c.UseAllOfToExtendReferenceSchemas();
});

builder.Services.AddDbContext<AppDbContext>(op =>
    op.UseSqlServer(builder.Configuration.GetConnectionString("Default"))
);

var app = builder.Build();

// Configure the HTTP request pipeline.
app.UseExceptionHandler();

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
app.UseSpa(b => b.UseProxyToSpaDevelopmentServer("http://localhost:__SpaPort__"));

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var allowDropDb = args.Contains("--allow-drop-db");
    
    try
    {
        Console.WriteLine("Ensuring database exists...");
        
        // Always apply pending migrations
        Console.WriteLine("Checking for pending migrations...");
        var pendingMigrations = (await db.Database.GetPendingMigrationsAsync()).ToList();
        var appliedMigrations = (await db.Database.GetAppliedMigrationsAsync()).ToList();

        Console.WriteLine($"Applied migrations: {appliedMigrations.Count}");
        if (appliedMigrations.Any())
        {
            foreach (var migration in appliedMigrations)
            {
                Console.WriteLine($"  - {migration}");
            }
        }

        Console.WriteLine($"Pending migrations: {pendingMigrations.Count}");
        if (pendingMigrations.Any())
        {
            foreach (var migration in pendingMigrations)
            {
                Console.WriteLine($"  - {migration}");
            }

            Console.WriteLine("Applying migrations...");
            await db.Database.MigrateAsync();
            Console.WriteLine("Migrations applied successfully.");
        }
        else
        {
            Console.WriteLine("Database schema is up to date.");
        }

        // Seed database with initial data
        await __AppName__.Data.DbSeeder.SeedAsync(db);
        Console.WriteLine("Database seeding completed.");
    }
    catch (Exception e)
    {
        Console.WriteLine($"Failed to migrate DB automatically: {e.Message}");
        Console.WriteLine($"Stack trace: {e.StackTrace}");
        if (e.InnerException != null)
        {
            Console.WriteLine($"Inner exception: {e.InnerException.Message}");
        }
    }
}

app.Run();
