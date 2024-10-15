import {
  ControlDefinitionExtension,
  createDataRenderer,
  DataRendererProps,
} from "@react-typed-forms/schemas";
import React, { useEffect } from "react";
import { Control } from "@react-typed-forms/core";

const CCOptions = { name: "Quickstream Credit Cards", value: "QuickstreamCC" };
export const QuickstreamExtension: ControlDefinitionExtension = {
  RenderOptions: CCOptions,
};

export function createQuickstreamCC(
  publishableApiKey: string,
  trustedFrameConfig: TrustedFrameConfig,
) {
  return createDataRenderer(
    (p) => (
      <QuickstreamCCRenderer
        {...p}
        publishableApiKey={publishableApiKey}
        trustedFrameConfig={trustedFrameConfig}
      />
    ),
    {
      renderType: CCOptions.value,
    },
  );
}

function QuickstreamCCRenderer({
  publishableApiKey,
  trustedFrameConfig,
  dataNode,
}: DataRendererProps & {
  publishableApiKey: string;
  trustedFrameConfig: TrustedFrameConfig;
}) {
  useEffect(() => {
    QuickstreamAPI.init({
      publishableApiKey,
    });
    QuickstreamAPI.creditCards.createTrustedFrame(
      trustedFrameConfig,
      (errors, data) => {
        const c = dataNode.control!;
        c.meta.trustedFrame = data.trustedFrame;
        c.value = true;
      },
    );
  }, []);
  return <div data-quickstream-api="creditCardContainer"></div>;
}

export function getTrustedFrame(
  control: Control<boolean>,
): TrustedFrameInstance {
  return control.meta.trustedFrame;
}

export interface TrustedFrameConfig {
  config: {
    supplierBusinessCode: string;
  };
  [other: string]: any;
}

declare namespace QuickstreamAPI {
  function init(options: { publishableApiKey: string }): void;
  let creditCards: {
    createTrustedFrame(
      options: TrustedFrameConfig,
      callback: QSCallback<{ trustedFrame: TrustedFrameInstance }>,
    ): void;
  };
}

export type QSCallback<V> = (errors: any, data: V) => void;
export interface SubmitFormResult {
  singleUseToken: {
    singleUseTokenId: string;
  };
}
export interface TrustedFrameInstance {
  // clearField(fieldName, callback): void;
  // changePlaceholder(fieldName, placeholder, callback): void;
  // changeStyle(elementName, style, callback): void;
  // setEventHandler( fieldName, event, handler ): void
  // getEventHandlers(): EventHandlersObject
  submitForm(callback: QSCallback<SubmitFormResult>): void;
  teardown(callback: QSCallback<unknown>): void;
}
