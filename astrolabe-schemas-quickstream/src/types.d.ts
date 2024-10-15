declare namespace QuickstreamAPI {
  function init(options: { publishableApiKey: string });
  let creditCards: {
    createTrustedFrame(
      options: {
        config: {
          supplierBusinessCode: string;
        };
      },
      callback: (errors: unknown, data: { trustedFrame: unknown }) => void,
    );
  };
}
