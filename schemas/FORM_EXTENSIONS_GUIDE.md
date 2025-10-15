# Form Extensions Guide

## Overview

This document describes how to create custom form extensions in the ServiceTas application. Form extensions allow you to add custom renderers for inputs, groups, adornments, labels, and display components that integrate seamlessly with the AppForms system.

## Extension Types

The form rendering system supports five types of extensions:

1. **Data Renderers** - Custom input/data entry controls
2. **Group Renderers** - Custom layouts for groups of fields
3. **Adornment Renderers** - Decorative or functional elements added to controls
4. **Label Renderers** - Custom rendering for field labels
5. **Display Renderers** - Custom read-only display components

## Architecture

Form extensions consist of three main parts:

1. **Extension Definition** (`formExtensions.ts`) - Defines configuration options
2. **Renderer Implementation** (`renderer.tsx` or separate files) - Implements the visual component
3. **Registration** (`renderer.tsx`) - Registers the renderer with the form system

## Creating a Form Extension

### Step 1: Define Extension Configuration

Create a `CustomRenderOptions` object in `formExtensions.ts`:

```typescript
import {
  buildSchema,
  CustomRenderOptions,
  boolField,
  stringField,
  intField,
  stringOptionsField
} from "@react-typed-forms/schemas";

// Define the configuration interface
export interface MyExtensionOptions {
  displayLabel: boolean;
  customColor?: string;
  size?: number;
}

// Create the extension definition
export const MyExtensionOptions: CustomRenderOptions = {
  value: "MyExtension",           // Unique identifier (used in renderType)
  name: "My Extension",            // Display name (shown in form editor)
  fields: buildSchema<MyExtensionOptions>({
    displayLabel: boolField("Display Label"),
    customColor: stringField("Custom Color"),
    size: intField("Size")
  })
};
```

**Field Types Available:**
- `boolField(label)` - Boolean checkbox
- `stringField(label)` - Text input
- `intField(label)` - Numeric input
- `stringOptionsField(label, ...options)` - Dropdown selector
- Custom field types from `@react-typed-forms/schemas`

**Important Notes:**
- `value` must be unique across all extensions
- `fields` is optional - use empty array `[]` if no configuration needed
- For extensions that extend existing types (like `DataRenderType.Dropdown`), use the existing type as the `value`

### Step 2: Create the Renderer Component

#### Data Renderer (Input Controls)

Data renderers are for custom input controls. Examples: Switch, AddressFinder, Chart, Map.

**File location:** `renderer.tsx` or `renderer/MyControl.tsx`

```typescript
import { createDataRenderer } from "@react-typed-forms/schemas";
import { MyExtensionOptions } from "./formExtensions";

export const MyDataRenderer = createDataRenderer(
  (props, renderer) => {
    const { control, renderOptions, className, id } = props;
    const options = renderOptions as MyExtensionOptions & RenderOptions;

    return (
      <div className={className}>
        <input
          type="text"
          value={control.value ?? ''}
          onChange={(e) => control.setValue(e.target.value)}
          disabled={control.disabled}
        />
        {options.displayLabel && <span>{control.value}</span>}
      </div>
    );
  },
  {
    renderType: MyExtensionOptions.value,  // Must match the value from Step 1
  }
);
```

**Key Props Available:**
- `control` - The form control (has `.value`, `.setValue()`, `.disabled`, `.fields`)
- `renderOptions` - Configuration options from the extension definition
- `className` - CSS classes to apply
- `id` - Unique identifier for the field
- `dataNode` - Access to parent/child nodes in the form tree
- `renderer` - Access to the FormRenderer for rendering nested elements

**Example: Switch Renderer (from renderer.tsx:94-121)**

```typescript
const SwitchRenderer = createDataRenderer(
  (props, renderer) => {
    const { renderOptions, control } = props;
    const { displayLabel } = renderOptions as ExtendedSwitch & RenderOptions;

    return (
      <label className="inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          checked={control.value ?? false}
          onChange={() => control.setValue((x) => !x)}
          className="sr-only peer"
          disabled={control.disabled}
        />
        <div className="..." />
        {displayLabel && (
          <span className="ms-3 subhead">
            {control.value ?? false ? "On" : "Off"}
          </span>
        )}
      </label>
    );
  },
  {
    renderType: SwitchOptions.value,
  }
);
```

#### Group Renderer (Layout Components)

Group renderers control how groups of fields are laid out. Example: TopLevelGroup.

```typescript
import { createGroupRenderer, GroupRendererProps } from "@react-typed-forms/schemas";

export const MyGroupRenderer = createGroupRenderer(
  (props, renderers) => {
    const { className, style, definition, dataContext, renderChild, formNode } = props;

    return (
      <div className={className} style={style}>
        {formNode.children.map((child, i) => renderChild(child))}
      </div>
    );
  },
  {
    renderType: MyGroupOptions.value,
  }
);
```

**Key Props Available:**
- `definition` - The group definition
- `dataContext` - Data context including parentNode
- `renderChild` - Function to render child fields
- `formNode` - The form node with children array
- `className`, `style` - Styling properties

**Example: TopLevelGroup Renderer (from renderer.tsx:176-213)**

```typescript
const topLevelGroupRenderer = createGroupRenderer(
  (p, renderers) => (
    <div className={rendererClass(className, DefaultRenderOptions.group?.standardClassName)}>
      <AllErrors
        definition={definition}
        dataNode={dataContext.parentNode}
        labelRenderer={renderers.renderLabelText}
      />
      {formNode.children.map((c, i) => renderChild(c))}
    </div>
  ),
  {
    renderType: TopLevelGroupOption.value,
  }
);
```

#### Adornment Renderer (Decorations)

Adornment renderers add decorative or functional elements to controls. Examples: HelpText, Tooltip.

```typescript
import {
  createAdornmentRenderer,
  wrapMarkup,
  appendMarkupAt,
  AdornmentPlacement,
  ControlAdornment
} from "@react-typed-forms/schemas";

export const MyAdornmentRenderer = createAdornmentRenderer(
  (props, renderers) => {
    const options = props.adornment as MyAdornmentOptions & ControlAdornment;

    return {
      apply: wrapMarkup("children", (children) => (
        <div className="relative">
          {children}
          <span className="adornment">{options.adornmentText}</span>
        </div>
      )),
      priority: 0,  // Lower numbers render first (outer layers)
      adornment: props.adornment,
    };
  },
  {
    adornmentType: ControlAdornmentType.MyAdornment,
  }
);
```

**Markup Manipulation Functions:**
- `wrapMarkup(target, wrapper)` - Wraps the target element
  - Targets: `"children"`, `"label"`, `"control"`, etc.
- `appendMarkupAt(placement, element)` - Adds element at specific position
  - Placements: `AdornmentPlacement.LabelEnd`, `AdornmentPlacement.ControlEnd`, etc.

**Example: HelpText Renderer (from renderer.tsx:237-282)**

```typescript
const createHelpTextRenderer = (container: HTMLElement | null) => {
  return createAdornmentRenderer(
    (p, renderers) => {
      const label = (p.adornment as ExtendedHelpText).helpLabel;
      const helpText = (p.adornment as HelpTextAdornment).helpText;

      return {
        apply: appendMarkupAt(
          (p.adornment as HelpTextAdornment).placement ?? AdornmentPlacement.LabelEnd,
          <Popover.Root>
            <Popover.Trigger asChild>
              <button className="...">
                <i className="fa fa-info-circle mr-2" />
                {renderers.renderLabelText(label)}
              </button>
            </Popover.Trigger>
            <Popover.Portal container={container}>
              <Popover.Content className="...">
                <Div className="..." html={helpText} />
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>
        ),
        priority: 0,
        adornment: p.adornment,
      };
    },
    {
      adornmentType: ControlAdornmentType.HelpText,
    }
  );
};
```

#### Label Renderer (Custom Labels)

Label renderers customize how field labels are displayed. Example: HtmlLabel.

```typescript
import { createLabelRenderer, LabelType } from "@react-typed-forms/schemas";

export const MyLabelRenderer = createLabelRenderer(
  (props) => {
    return <span className="custom-label">{props.label}</span>;
  },
  {
    labelType: LabelType.Text,
  }
);
```

**Example: Html Label Renderer (from renderer.tsx:159-174)**

```typescript
const HtmlLabelRenderer = createLabelRenderer(
  (p) => <HtmlLabel label={p.label} />,
  { labelType: LabelType.Text }
);

function HtmlLabel({ label }: { label: ReactNode }) {
  const labelText = useMemo(() => {
    if (typeof label === "string") {
      return parse(label);  // Parse HTML string
    }
    return label;
  }, [label]);
  return labelText;
}
```

#### Display Renderer (Read-only Display)

Display renderers show read-only data. Example: Html display.

```typescript
import {
  createDisplayRenderer,
  DisplayDataType,
  HtmlDisplay
} from "@react-typed-forms/schemas";

export const MyDisplayRenderer = createDisplayRenderer(
  (props) => {
    const data = props.data as MyDisplayData;
    return <div className="display">{data.content}</div>;
  },
  {
    renderType: DisplayDataType.MyDisplay,
  }
);
```

**Example: Html Display Renderer (from renderer.tsx:123-138)**

```typescript
export function createHtmlRenderer(
  makeOnClick: (actionId: string, data: any) => () => void
) {
  return createDisplayRenderer(
    (props) => {
      return (
        <HtmlDisplayRenderer
          {...props}
          html={(props.data as HtmlDisplay).html ?? ""}
          makeOnClick={makeOnClick}
        />
      );
    },
    { renderType: DisplayDataType.Html }
  );
}
```

### Step 3: Register the Extension

#### Register in EditorExtension

Add your extension to `EditorExtension` in `formExtensions.ts`:

```typescript
export const EditorExtension: ControlDefinitionExtension = {
  GroupRenderOptions: TopLevelGroupOption,  // Single group renderer (optional)
  ControlAdornment: [                        // Array of adornment options
    HelpTextOptions,
    SpotlightOptions,
    MyAdornmentOptions  // Add your adornment here
  ],
  RenderOptions: [                           // Array of data/display renderers
    MapOptions,
    ChartDefinition,
    SwitchOptions,
    MyExtensionOptions  // Add your data renderer here
  ],
};
```

**Extension Categories:**
- `GroupRenderOptions` - Single group renderer option
- `ControlAdornment` - Array of adornment options
- `RenderOptions` - Array of data renderer options

#### Register the Renderer

Add your renderer to the `createStdRenderer` function in `renderer.tsx`:

```typescript
export function createStdRenderer(
  defaults: DefaultRendererOptions,
  options: StdRenderOptions,
  ...others: RendererRegistration[]
) {
  return createFormRenderer(
    [
      ...others,
      HtmlLabelRenderer,
      MapRenderer,
      SwitchRenderer,
      MyDataRenderer,              // Add your renderer here
      MyAdornmentRenderer(options.container),
      topLevelGroupRenderer,
      // ... other renderers
    ],
    createDefaultRenderers(defaults)
  );
}
```

**Registration Order:**
- Renderers are processed in order
- More specific renderers should come before more general ones
- Adornments with lower priority numbers render first (outer layers)

## Complete Examples

### Example 1: Simple Switch Control

**formExtensions.ts:**
```typescript
export interface ExtendedSwitch {
  displayLabel: boolean;
}

export const SwitchOptions: CustomRenderOptions = {
  name: "Switch",
  value: "Switch",
  fields: buildSchema<ExtendedSwitch>({
    displayLabel: boolField("Display Label"),
  }),
};
```

**renderer.tsx:**
```typescript
const SwitchRenderer = createDataRenderer(
  (props, renderer) => {
    const { renderOptions, control } = props;
    const { displayLabel } = renderOptions as ExtendedSwitch & RenderOptions;

    return (
      <label className="inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          checked={control.value ?? false}
          onChange={() => control.setValue((x) => !x)}
          className="sr-only peer"
          disabled={control.disabled}
        />
        <div className="relative w-11 h-6 bg-[#e4e4e7] peer-checked:bg-accent ..." />
        {displayLabel && (
          <span className="ms-3 subhead">
            {control.value ?? false ? "On" : "Off"}
          </span>
        )}
      </label>
    );
  },
  {
    renderType: SwitchOptions.value,
  }
);
```

### Example 2: Chart Renderer with Configuration

**ChartRendererConfigs.ts:**
```typescript
export enum ChartType {
  Doughnut = "Doughnut",
}

export interface ChartOptions {
  chartType?: string;
  ringColor?: string;
  ringBackgroundColor?: string;
  displayText?: boolean;
}

const ChartFields = buildSchema<ChartOptions>({
  chartType: stringOptionsField("Type", {
    name: "Doughnut",
    value: ChartType.Doughnut,
  }),
  ringColor: stringField("Ring Color"),
  ringBackgroundColor: stringField("Ring Background Color"),
  displayText: boolField("Display Text"),
});

export const ChartDefinition: CustomRenderOptions = {
  name: "Chart",
  value: "Chart",
  fields: ChartFields,
};
```

**ChartRenderer.tsx:**
```typescript
export function createChartRenderer(options: ChartOptions = {}) {
  return createDataRenderer(
    (p) => {
      const { id, renderOptions, dataNode } = p;
      const chartOptions = mergeObjects(
        renderOptions as ChartOptions & RenderOptions,
        options
      ) ?? {};

      const { chartType } = chartOptions;
      const fields = dataNode.control.fields;

      switch (chartType) {
        case ChartType.Doughnut:
          return (
            <DoughnutChart
              key={id}
              progress={fields.activePoints as Control<number>}
              total={fields.totalPoints as Control<number>}
              ringBackgroundColor={chartOptions.ringBackgroundColor}
              ringColor={chartOptions.ringColor}
              displayText={chartOptions.displayText ?? false}
            />
          );
        default:
          return null;
      }
    },
    {
      renderType: ChartDefinition.value,
    }
  );
}
```

### Example 3: Address Finder with External Service

**formExtensions.ts:**
```typescript
export interface AddressExtraOptions {
  disablePostalAddress?: boolean;
}

export const AddressFinderOptions: CustomRenderOptions = {
  name: "AddressFinder",
  value: "AddressFinder",
  fields: buildSchema<AddressExtraOptions>({
    disablePostalAddress: boolField("Disable Postal Address"),
  }),
};
```

**AddressFinderControl.tsx:**
```typescript
export function createAddressFinderRenderer() {
  return createDataRenderer(
    (dataProps, renderer) => (
      <AddressFinderRenderer renderer={renderer} dataProps={dataProps} />
    ),
    {
      renderType: AddressFinderOptions.value,
    }
  );
}

function AddressFinderRenderer({
  renderer,
  dataProps,
}: {
  dataProps: DataRendererProps;
  renderer: FormRenderer;
}) {
  const {
    addressSuggestions,
    addressSearchControl,
    getSuggestions,
    selectedAddress,
  } = useAddressFinder({
    dataProps,
    key: "API_KEY_HERE",
  });

  return (
    <AutocompleteInput
      options={addressSuggestions.value}
      getOptionText={(x) => x.fullAddress}
      selectedControl={selectedAddress}
      textControl={addressSearchControl as Control<string>}
      onInputChange={(_, v) => {
        addressSearchControl.value = v;
        getSuggestions(v);
      }}
    />
  );
}
```

## Best Practices

### 1. Naming Conventions
- Use descriptive names: `SwitchRenderer`, `ChartRenderer`, not `CustomRenderer1`
- Interface names should end with "Options": `ChartOptions`, `SwitchOptions`
- Renderer constants should end with "Renderer": `MapRenderer`, `SwitchRenderer`

### 2. Configuration Design
- Only add configuration options that are truly needed
- Use appropriate field types for the data (bool, string, int, options)
- Provide sensible defaults in the renderer implementation
- Use empty `fields: []` if no configuration is needed

### 3. Component Structure
- Keep renderer logic minimal - delegate to separate components
- Use hooks for complex logic (see `useAddressFinder`)
- Handle undefined/null values gracefully
- Always respect `control.disabled` state

### 4. Styling
- Use `rendererClass()` to merge CSS classes properly
- Respect the `className` prop passed to your renderer
- Use Tailwind classes for consistency
- Consider responsive design (mobile vs desktop)

### 5. Accessibility
- Add proper ARIA attributes
- Support keyboard navigation where appropriate
- Use semantic HTML elements
- Provide proper labels and error messages

### 6. Performance
- Use `useMemo` for expensive computations
- Use `useControlEffect` instead of `useEffect` for control changes
- Avoid unnecessary re-renders
- Consider virtualization for long lists

### 7. Type Safety
- Always define TypeScript interfaces for options
- Use proper type assertions with `as` operator
- Leverage Control<T> types from `@react-typed-forms/core`

### 8. Testing Considerations
- Test with disabled state
- Test with null/undefined values
- Test validation errors
- Test responsive behavior

## Common Patterns

### Accessing Form Data

```typescript
// Current control value
const value = control.value;

// Set value
control.setValue("new value");

// Access parent data node
const parentNode = getRootDataNode(dataNode);
const rootControl = parentNode.control;

// Access child fields (for object controls)
const fields = control.fields;
const childValue = fields.someField.value;
```

### Conditional Rendering

```typescript
const MyRenderer = createDataRenderer(
  (props) => {
    const { control, renderOptions } = props;
    const options = renderOptions as MyOptions;

    if (!options.enabled) {
      return <span>{control.value}</span>;  // Read-only fallback
    }

    return <input ... />;  // Full editing control
  },
  { renderType: MyOptions.value }
);
```

### Handling Complex State

```typescript
function MyComplexRenderer({ dataProps }: { dataProps: DataRendererProps }) {
  // Use custom hooks for complex logic
  const { state, actions } = useMyCustomLogic(dataProps.control);

  // Use control effects for reactive updates
  useControlEffect(
    () => dataProps.control.value,
    (newValue) => {
      // React to value changes
      actions.handleValueChange(newValue);
    }
  );

  return <div>...</div>;
}
```

### Accessing Renderer Utilities

```typescript
const MyRenderer = createDataRenderer(
  (props, renderer) => {
    // Access HTML elements
    const { Div, Span } = renderer.html;

    // Render labels
    const labelElement = renderer.renderLabelText("My Label");

    // Render children
    const children = renderer.renderChildren(...);

    return <Div>...</Div>;
  },
  { renderType: MyOptions.value }
);
```

## Debugging Tips

1. **Renderer not showing up:**
   - Check that `renderType` matches the `value` in CustomRenderOptions
   - Verify the renderer is registered in `createStdRenderer`
   - Ensure the extension is added to `EditorExtension`

2. **Configuration not working:**
   - Check the interface matches the `buildSchema` definition
   - Verify the type assertion in the renderer: `renderOptions as MyOptions`
   - Check for typos in field names

3. **Control value not updating:**
   - Use `control.setValue()` not direct assignment
   - Check if control is disabled
   - Verify the control is not being recreated

4. **Styling issues:**
   - Use `rendererClass()` to merge classes
   - Check parent container styles
   - Verify Tailwind classes are valid

## References

### Key Imports

```typescript
// Core schema functions
import {
  createDataRenderer,
  createGroupRenderer,
  createAdornmentRenderer,
  createLabelRenderer,
  createDisplayRenderer,
  createFormRenderer,
  buildSchema,
  CustomRenderOptions,
  ControlDefinitionExtension,
} from "@react-typed-forms/schemas";

// Control management
import { Control, useControlEffect } from "@react-typed-forms/core";

// Field types
import {
  boolField,
  stringField,
  intField,
  stringOptionsField,
} from "@react-typed-forms/schemas";
```

### File Locations

- **Extension Definitions**: `ServiceTasAPI/NewClientApp/client-common/formExtensions.ts`
- **Main Renderer**: `ServiceTasAPI/NewClientApp/client-common/renderer.tsx`
- **Custom Renderers**: `ServiceTasAPI/NewClientApp/client-common/renderer/`

### Related Documentation

- `@react-typed-forms/schemas` - Core form schema library
- `@react-typed-forms/core` - Form control management
- `@astroapps/schemas-*` - Pre-built renderer packages