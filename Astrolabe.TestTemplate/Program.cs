using System.Reflection;
using Astrolabe.JSON.Extensions;
using Astrolabe.LocalUsers;
using Astrolabe.OIDC;
using Astrolabe.TestTemplate.Service;
using Astrolabe.TestTemplate.Workflow;
using Astrolabe.Web.Common;
using Microsoft.AspNetCore.Authentication.JwtBearer;
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

// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SupportNonNullableReferenceTypes();
    c.AddServer(new OpenApiServer() { Url = "https://localhost:5001" });
    c.CustomOperationIds(apiDesc =>
    {
        // For controllers
        if (
            apiDesc.ActionDescriptor is ControllerActionDescriptor controllerDesc
            && apiDesc.TryGetMethodInfo(out MethodInfo methodInfo)
        )
        {
            return $"{controllerDesc.ControllerName}_{methodInfo.Name}";
        }

        // For minimal APIs - use the tag + endpoint name
        var endpointName = apiDesc
            .ActionDescriptor.EndpointMetadata.OfType<EndpointNameMetadata>()
            .FirstOrDefault()
            ?.EndpointName;

        if (endpointName == null)
            return null;
        var tag = apiDesc
            .ActionDescriptor.EndpointMetadata.OfType<TagsAttribute>()
            .FirstOrDefault()
            ?.Tags.FirstOrDefault()
            ?.Replace(" ", "");

        return tag != null ? $"{tag}_{endpointName}" : endpointName;
    });
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "My API", Version = "v1" });
    c.UseAllOfForInheritance();
    c.UseAllOfToExtendReferenceSchemas();
});

builder.Services.AddDbContext<AppDbContext>(op =>
    op.UseSqlServer(builder.Configuration.GetConnectionString("Default"))
);

// JWT authentication for local users
var jwtSecretKey = Convert.FromHexString(
    builder.Configuration["Jwt:SecretKey"] ?? throw new InvalidOperationException("Jwt:SecretKey is required")
);
var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "TestTemplate";
var jwtAudience = builder.Configuration["Jwt:Audience"] ?? "TestTemplate";
var jwtConfig = new BasicJwtToken(jwtSecretKey, jwtIssuer, jwtAudience);
builder.Services.AddSingleton(jwtConfig);

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(jwtConfig.ConfigureJwtBearer());

builder.Services.AddAuthorization();

// Local user services
builder.Services.AddSingleton<IPasswordHasher>(new SaltedSha256PasswordHasher("test-salt"));
builder.Services.AddScoped<ILocalUserService<CreateAccountRequest, Guid>, TestLocalUserService>();
builder.Services.AddScoped<ILocalUserIdProvider<Guid>, TestUserIdProvider>();
builder.Services.AddLocalUserEndpoints<TestLocalUserEndpoints, CreateAccountRequest, Guid>(
    options =>
    {
        options.EnableVerifyAccount = false;
        options.EnableVerifyAccountWithMfa = false;
        options.EnableSendAuthenticationMfaCode = false;
        options.EnableCompleteAuthentication = false;
        options.EnableForgotPassword = false;
        options.EnableChangeEmail = false;
        options.EnableInitiateMfaNumberChange = false;
        options.EnableCompleteMfaNumberChange = false;
        options.EnableChangePassword = false;
        options.EnableResetPassword = false;
        options.EnableSendMfaCodeToNumber = false;
    }
);

// OIDC provider
var oidcConfig = new OidcProviderConfig
{
    Issuer = "https://localhost:5001/oidc",
    RsaKey = new OidcRsaKeyConfig
    {
        PemKey = builder.Configuration["Oidc:RsaPrivateKey"]
            ?? throw new InvalidOperationException("Oidc:RsaPrivateKey is required")
    },
    Clients =
    [
        new OidcClientConfig
        {
            ClientId = "test-spa",
            RedirectUris = ["https://localhost:5001/"],
            PostLogoutRedirectUris = ["https://localhost:5001/"]
        }
    ],
    LoginPageUrl = "/locallogin"
};
builder.Services.AddOidcEndpoints<TestOidcEndpoints>(oidcConfig);
builder.Services.AddScoped<IOidcUserClaimsProvider, TestOidcUserClaimsProvider>();

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
app.UseAuthentication();
app.UseAuthorization();
app.UseEndpoints(e => e.MapControllers());
app.MapLocalUserEndpoints<TestLocalUserEndpoints, CreateAccountRequest, Guid>("api/user");
app.MapOidcEndpoints<TestOidcEndpoints>("/oidc");
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
