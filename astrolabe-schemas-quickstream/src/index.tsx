import {
  ControlDefinitionExtension,
  createDataRenderer,
  DataRendererProps,
} from "@react-typed-forms/schemas";
import React, { useEffect } from "react";

const CCOptions = { name: "Quickstream Credit Cards", value: "QuickstreamCC" };
export const QuickstreamExtension: ControlDefinitionExtension = {
  RenderOptions: CCOptions,
};

export function createQuickstreamCC(
  publishableApiKey: string,
  supplierBusinessCode: string,
) {
  return createDataRenderer(
    (p) => (
      <QuickstreamCCRenderer
        {...p}
        publishableApiKey={publishableApiKey}
        supplierBusinessCode={supplierBusinessCode}
      />
    ),
    {
      renderType: CCOptions.value,
    },
  );
}

function QuickstreamCCRenderer({
  publishableApiKey,
  supplierBusinessCode,
}: DataRendererProps & {
  publishableApiKey: string;
  supplierBusinessCode: string;
}) {
  useEffect(() => {
    QuickstreamAPI.init({
      publishableApiKey,
    });
    QuickstreamAPI.creditCards.createTrustedFrame(
      {
        config: { supplierBusinessCode },
      },
      (errors, data) => {
        console.log(data.trustedFrame);
      },
    );
  }, []);
  return <div data-quickstream-api="creditCardContainer"></div>;
}
