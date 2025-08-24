import { describe, expect, it, jest } from "@jest/globals";
import fc from "fast-check";
import { createFormRenderer } from "../src/createFormRenderer";
import { 
  DataRendererRegistration,
  GroupRendererRegistration,
  ActionRendererRegistration,
  AdornmentRendererRegistration,
  LabelRendererRegistration,
  LayoutRendererRegistration
} from "../src/renderers";
import { LabelType } from "../src/controlRender";
import { DefaultRenderers } from "../lib";
import { ReactElement } from "react";

// Simple mock renderer functions for testing - use type assertions to bypass strict typing
const mockDataRender = jest.fn((props, renderers) => ({ type: "div", props: { children: "mock-data-result" }, key: null })) as any;
const mockGroupRender = jest.fn((props, renderers) => ({ type: "div", props: { children: "mock-group-result" }, key: null })) as any;
const mockActionRender = jest.fn((props, renderers) => ({ type: "button", props: { children: "mock-action-result" }, key: null })) as any;
const mockLabelRender = jest.fn((props, start, end, renderers) => ({ type: "label", props: { children: "mock-label-result" }, key: null })) as any;
const mockLayoutRender = jest.fn((props, renderers) => ({ children: "mock-layout-result" })) as any;
const mockAdornmentRender = jest.fn((props, renderers) => ({ apply: jest.fn(), priority: 0 })) as any;

// Helper for creating consistent mock default renderers - bypass all type checking
const mockDefaultRenderers = {
  data: { type: "data", render: jest.fn((props, renderers) => ({ type: "div", props: { children: "default-data-result" }, key: null })) },
  group: { type: "group", render: jest.fn((props, renderers) => ({ type: "div", props: { children: "default-group-result" }, key: null })) },
  display: { type: "display", render: jest.fn((props, renderers) => ({ type: "div", props: { children: "default-display-result" }, key: null })) },
  action: { type: "action", render: jest.fn((props, renderers) => ({ type: "button", props: { children: "default-action-result" }, key: null })) },
  array: { type: "array", render: jest.fn((props, renderers) => ({ type: "div", props: { children: "default-array-result" }, key: null })) },
  adornment: { 
    type: "adornment",
    render: jest.fn((props, renderers) => ({
      apply: jest.fn(),
      priority: 0
    }))
  },
  label: { type: "label", render: jest.fn((props, start, end, renderers) => ({ type: "label", props: { children: "default-label-result" }, key: null })) },
  renderLayout: { type: "layout", render: jest.fn((props, renderers) => ({ children: "default-layout-result" })) },
  visibility: { type: "visibility", render: jest.fn((props, renderers) => ({ type: "div", props: { children: "default-visibility-result" }, key: null })) },
  extraRenderers: [],
  html: {
    Div: "div" as any,
    Span: "span" as any,
    Button: "button" as any,
    Input: "input" as any,
    Label: "label" as any,
    I: "i" as any,
    B: "b" as any,
    H1: "h1" as any
  }
} satisfies DefaultRenderers;

describe("createFormRenderer renderer registration matching", () => {
  
  describe("GroupRenderer registration matching", () => {
    it("should match by renderType", () => {
      fc.assert(
        fc.property(
          fc.constantFrom("Standard", "Accordion", "Tabs", "Card"),
          (renderType) => {
            const registration: GroupRendererRegistration = {
              type: "group",
              renderType: renderType,
              render: mockGroupRender
            };

            const renderer = createFormRenderer([registration], mockDefaultRenderers);
            
            const props = {
              renderOptions: { type: renderType },
              formNode: {},
              children: []
            };

            mockGroupRender.mockClear();
            renderer.renderGroup(props as any);
            
            expect(mockGroupRender).toHaveBeenCalled();
          }
        )
      );
    });

    it("should handle array of renderTypes", () => {
      fc.assert(
        fc.property(
          fc.array(fc.constantFrom("Standard", "Accordion", "Tabs"), { minLength: 1 }),
          fc.constantFrom("Standard", "Accordion", "Tabs"),
          (supportedTypes, requestedType) => {
            const registration: GroupRendererRegistration = {
              type: "group",
              renderType: supportedTypes,
              render: mockGroupRender
            };

            const renderer = createFormRenderer([registration], mockDefaultRenderers);
            
            const props = {
              renderOptions: { type: requestedType },
              formNode: {},
              children: []
            };

            mockGroupRender.mockClear();
            const defaultGroupRender = mockDefaultRenderers.group.render as jest.Mock;
            defaultGroupRender.mockClear();
            
            renderer.renderGroup(props as any);
            
            const shouldMatch = supportedTypes.includes(requestedType);
            if (shouldMatch) {
              expect(mockGroupRender).toHaveBeenCalled();
              expect(defaultGroupRender).not.toHaveBeenCalled();
            } else {
              expect(mockGroupRender).not.toHaveBeenCalled();
              expect(defaultGroupRender).toHaveBeenCalled();
            }
          }
        )
      );
    });
  });

  describe("ActionRenderer registration matching", () => {
    it("should match by actionType", () => {
      fc.assert(
        fc.property(
          fc.string().filter(s => s.length > 0),
          (actionType) => {
            const registration: ActionRendererRegistration = {
              type: "action",
              actionType: actionType,
              render: mockActionRender
            };

            const renderer = createFormRenderer([registration], mockDefaultRenderers);
            
            const props = {
              actionId: actionType,
              data: {},
              formNode: {}
            };

            mockActionRender.mockClear();
            renderer.renderAction(props as any);
            
            expect(mockActionRender).toHaveBeenCalled();
          }
        )
      );
    });

    it("should handle array of actionTypes", () => {
      fc.assert(
        fc.property(
          fc.array(fc.string().filter(s => s.length > 0), { minLength: 1 }),
          fc.string().filter(s => s.length > 0),
          (supportedActions, requestedAction) => {
            const registration: ActionRendererRegistration = {
              type: "action",
              actionType: supportedActions,
              render: mockActionRender
            };

            const renderer = createFormRenderer([registration], mockDefaultRenderers);
            
            const props = {
              actionId: requestedAction,
              data: {},
              formNode: {}
            };

            mockActionRender.mockClear();
            const defaultActionRender = mockDefaultRenderers.action.render as jest.Mock;
            defaultActionRender.mockClear();
            
            renderer.renderAction(props as any);
            
            const shouldMatch = supportedActions.includes(requestedAction);
            if (shouldMatch) {
              expect(mockActionRender).toHaveBeenCalled();
              expect(defaultActionRender).not.toHaveBeenCalled();
            } else {
              expect(mockActionRender).not.toHaveBeenCalled();
              expect(defaultActionRender).toHaveBeenCalled();
            }
          }
        )
      );
    });
  });

  describe("AdornmentRenderer registration matching", () => {
    it("should match by adornmentType", () => {
      fc.assert(
        fc.property(
          fc.constantFrom("icon", "validation", "prefix", "suffix"),
          (adornmentType) => {
            const registration: AdornmentRendererRegistration = {
              type: "adornment",
              adornmentType: adornmentType,
              render: mockAdornmentRender
            };

            const renderer = createFormRenderer([registration], mockDefaultRenderers);
            
            const props = {
              adornment: { type: adornmentType },
              dataContext: {},
              formNode: {}
            };

            mockAdornmentRender.mockClear();
            renderer.renderAdornment(props as any);
            
            expect(mockAdornmentRender).toHaveBeenCalled();
          }
        )
      );
    });
  });

  describe("LabelRenderer registration matching", () => {
    it("should match by labelType", () => {
      fc.assert(
        fc.property(
          fc.constantFrom(LabelType.Text, LabelType.Control, LabelType.Group),
          (labelType) => {
            const registration: LabelRendererRegistration = {
              type: "label",
              labelType: labelType,
              render: mockLabelRender
            };

            const renderer = createFormRenderer([registration], mockDefaultRenderers);
            
            const props = {
              label: "Test Label",
              type: labelType
            };

            mockLabelRender.mockClear();
            renderer.renderLabel(props as any, undefined, undefined);
            
            expect(mockLabelRender).toHaveBeenCalled();
          }
        )
      );
    });
  });

  describe("LayoutRenderer registration matching", () => {
    it("should use custom match function", () => {
      fc.assert(
        fc.property(
          fc.boolean(),
          fc.record({
            children: fc.anything(),
            className: fc.option(fc.string(), { nil: undefined })
          }),
          (shouldMatch, layoutProps) => {
            const matchFn = jest.fn().mockReturnValue(shouldMatch) as any;
            const registration: LayoutRendererRegistration = {
              type: "layout",
              match: matchFn,
              render: mockLayoutRender
            };

            const renderer = createFormRenderer([registration], mockDefaultRenderers);

            mockLayoutRender.mockClear();
            const defaultLayoutRender = mockDefaultRenderers.renderLayout.render as jest.Mock;
            defaultLayoutRender.mockClear();
            
            renderer.renderLayout(layoutProps as any);
            
            expect(matchFn).toHaveBeenCalledWith(layoutProps);
            
            if (shouldMatch) {
              expect(mockLayoutRender).toHaveBeenCalled();
              expect(defaultLayoutRender).not.toHaveBeenCalled();
            } else {
              expect(mockLayoutRender).not.toHaveBeenCalled();
              expect(defaultLayoutRender).toHaveBeenCalled();
            }
          }
        )
      );
    });

    it("should match when no match function provided", () => {
      fc.assert(
        fc.property(
          fc.record({
            children: fc.anything(),
            className: fc.option(fc.string(), { nil: undefined })
          }),
          (layoutProps) => {
            const registration: LayoutRendererRegistration = {
              type: "layout",
              // No match function - should always match
              render: mockLayoutRender
            };

            const renderer = createFormRenderer([registration], mockDefaultRenderers);

            mockLayoutRender.mockClear();
            renderer.renderLayout(layoutProps as any);
            
            expect(mockLayoutRender).toHaveBeenCalled();
          }
        )
      );
    });
  });

  describe("isOneOf matching utility", () => {
    it("should handle single values correctly", () => {
      fc.assert(
        fc.property(
          fc.string(),
          fc.string(),
          (criteriaValue, testValue) => {
            // Test the isOneOf function behavior directly by testing group renderer
            const registration: GroupRendererRegistration = {
              type: "group",
              renderType: criteriaValue,
              render: mockGroupRender
            };

            const renderer = createFormRenderer([registration], mockDefaultRenderers);
            
            const props = {
              renderOptions: { type: testValue },
              formNode: {},
              children: []
            };

            mockGroupRender.mockClear();
            const defaultGroupRender = mockDefaultRenderers.group.render as jest.Mock;
            defaultGroupRender.mockClear();
            
            renderer.renderGroup(props as any);
            
            const shouldMatch = criteriaValue === testValue;
            if (shouldMatch) {
              expect(mockGroupRender).toHaveBeenCalled();
              expect(defaultGroupRender).not.toHaveBeenCalled();
            } else {
              expect(mockGroupRender).not.toHaveBeenCalled();
              expect(defaultGroupRender).toHaveBeenCalled();
            }
          }
        )
      );
    });

    it("should handle undefined criteria as match-all", () => {
      fc.assert(
        fc.property(
          fc.string(),
          (testValue) => {
            const registration: GroupRendererRegistration = {
              type: "group",
              // undefined renderType should match anything
              render: mockGroupRender
            };

            const renderer = createFormRenderer([registration], mockDefaultRenderers);
            
            const props = {
              renderOptions: { type: testValue },
              formNode: {},
              children: []
            };

            mockGroupRender.mockClear();
            renderer.renderGroup(props as any);
            
            // Should always match when criteria is undefined
            expect(mockGroupRender).toHaveBeenCalled();
          }
        )
      );
    });
  });

  describe("Renderer priority and fallback", () => {
    it("should prioritize first matching registration", () => {
      fc.assert(
        fc.property(
          fc.string(),
          (renderType) => {
            const firstRenderer = jest.fn((props, renderers) => "first") as any;
            const secondRenderer = jest.fn((props, renderers) => "second") as any;
            
            const registrations: GroupRendererRegistration[] = [
              { type: "group", renderType: renderType, render: firstRenderer },
              { type: "group", renderType: renderType, render: secondRenderer }
            ];

            const renderer = createFormRenderer(registrations, mockDefaultRenderers);
            
            const props = {
              renderOptions: { type: renderType },
              formNode: {},
              children: []
            };

            renderer.renderGroup(props as any);
            
            // First matching renderer should be used
            expect(firstRenderer).toHaveBeenCalled();
            expect(secondRenderer).not.toHaveBeenCalled();
          }
        )
      );
    });

    it("should fall back to default when no custom renderer matches", () => {
      fc.assert(
        fc.property(
          fc.string(),
          fc.string(),
          (nonMatchingType, testType) => {
            fc.pre(nonMatchingType !== testType); // Ensure they don't match
            
            const nonMatchingRegistration: GroupRendererRegistration = {
              type: "group",
              renderType: nonMatchingType,
              render: jest.fn((props, renderers) => "custom") as any
            };

            const defaultRenderer = jest.fn((props, renderers) => ({ type: "div", props: { children: "default" }, key: null }));
            const defaultRenderers = {
              ...mockDefaultRenderers,
              group: { type: "group" as const, render: defaultRenderer }
            };

            const renderer = createFormRenderer([nonMatchingRegistration], defaultRenderers);
            
            const props = {
              renderOptions: { type: testType },
              formNode: {},
              children: []
            };

            renderer.renderGroup(props as any);
            
            // Should fall back to default renderer
            expect(defaultRenderer).toHaveBeenCalled();
            expect(nonMatchingRegistration.render).not.toHaveBeenCalled();
          }
        )
      );
    });
  });
});