using Astrolabe.OIDC;

namespace Astrolabe.TestTemplate.Service;

public class TestOidcEndpoints(OidcProviderConfig config, OidcEndpointOptions? options = null)
    : OidcEndpoints(config, options);
