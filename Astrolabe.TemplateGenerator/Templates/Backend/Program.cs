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
        
        // Check if database can be connected to
        var canConnect = await db.Database.CanConnectAsync();
        if (!canConnect)
        {
            Console.WriteLine("Database does not exist. Creating and migrating...");
            await db.Database.MigrateAsync();
        }
        else
        {
            // Database exists, check if tables exist
            var pendingMigrations = await db.Database.GetPendingMigrationsAsync();
            var appliedMigrations = await db.Database.GetAppliedMigrationsAsync();
            
            Console.WriteLine($"Applied migrations: {appliedMigrations.Count()}");
            Console.WriteLine($"Pending migrations: {pendingMigrations.Count()}");
            
            // Check if the database schema is valid
            bool schemaValid = false;
            try
            {
                // Try to query the Teas table to see if it exists
                await db.Teas.AnyAsync();
                Console.WriteLine("Database schema is valid.");
                schemaValid = true;
            }
            catch (Microsoft.Data.SqlClient.SqlException ex)
            {
                Console.WriteLine($"Database schema validation failed: {ex.Message}");
                
                if (!allowDropDb)
                {
                    Console.WriteLine("ERROR: Database schema is corrupt or incomplete.");
                    Console.WriteLine("To allow automatic database deletion and recreation, run with: dotnet run --allow-drop-db");
                    Console.WriteLine("Application startup failed.");
                    Environment.Exit(1);
                }
                
                Console.WriteLine("Database schema is corrupt or incomplete. Deleting and recreating...");
                try
                {
                    await db.Database.EnsureDeletedAsync();
                    Console.WriteLine("Database deleted.");
                    
                    // Use EnsureCreated to create all tables from the model
                    // This bypasses migrations and creates tables directly
                    var created = await db.Database.EnsureCreatedAsync();
                    if (created)
                    {
                        Console.WriteLine("Database and tables created successfully.");
                    }
                    
                    // Create migration history table if it doesn't exist and mark migration as applied
                    await db.Database.ExecuteSqlRawAsync(@"
                        IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = '__EFMigrationsHistory')
                        BEGIN
                            CREATE TABLE [__EFMigrationsHistory] (
                                [MigrationId] nvarchar(150) NOT NULL,
                                [ProductVersion] nvarchar(32) NOT NULL,
                                CONSTRAINT [PK___EFMigrationsHistory] PRIMARY KEY ([MigrationId])
                            );
                        END");
                    
                    await db.Database.ExecuteSqlRawAsync(@"
                        IF NOT EXISTS (SELECT * FROM __EFMigrationsHistory WHERE MigrationId = '20250101000000_InitialCreate')
                        BEGIN
                            INSERT INTO __EFMigrationsHistory (MigrationId, ProductVersion) 
                            VALUES ('20250101000000_InitialCreate', '8.0.0');
                        END");
                    
                    Console.WriteLine("Migration history updated.");
                    schemaValid = true;
                }
                catch (Exception recreateEx)
                {
                    Console.WriteLine($"Failed to recreate database: {recreateEx.Message}");
                    throw;
                }
            }
            
            // Apply any pending migrations (if database wasn't recreated above)
            if (pendingMigrations.Any())
            {
                Console.WriteLine("Applying pending migrations...");
                await db.Database.MigrateAsync();
            }
        }
        
        Console.WriteLine("Database migrations applied successfully.");

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
