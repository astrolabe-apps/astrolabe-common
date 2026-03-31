import { describe, it, expect } from "@jest/globals";
import { createControlContext } from "../src/lib/controlContextImpl";
import { noopReadContext } from "../src/lib/readContextImpl";
import {
  createFormStateNode,
  createSchemaDataNode,
  ControlDefinitionType,
  FieldType,
} from "../src/lib/form";
import type {
  ControlDefinition,
  SchemaField,
  FormGlobalOptions,
} from "../src/lib/form";

const rc = noopReadContext;

function makeCtx() {
  return createControlContext();
}

function makeGlobals(
  overrides?: Partial<FormGlobalOptions>,
): FormGlobalOptions {
  return {
    ctx: makeCtx(),
    clearHidden: false,
    ...overrides,
  };
}

function personSchema(): SchemaField {
  return {
    type: FieldType.Compound,
    field: "",
    children: [
      { type: FieldType.String, field: "name" },
      { type: FieldType.String, field: "email" },
      { type: FieldType.Int, field: "age" },
    ],
  };
}

// ── Basic state tests ────────────────────────────────────────────────

describe("FormStateNode basics", () => {
  it("creates with default state", () => {
    const globals = makeGlobals();
    const data = createSchemaDataNode(
      personSchema(),
      globals.ctx.newControl({ name: "Alice", email: "", age: 30 }),
    );
    const def: ControlDefinition = {
      type: ControlDefinitionType.Data,
      field: "name",
      title: "Name",
    };
    const node = createFormStateNode(def, data, globals);
    const state = node.getState(rc);

    expect(state.visible).toBeNull(); // no hidden set = null (no opinion)
    expect(state.disabled).toBe(false);
    expect(state.readonly).toBe(false);
    expect(state.dataNode).toBeDefined();
    expect(state.dataNode!.control.valueNow).toBe("Alice");

    node.cleanup();
  });

  it("resolves data node from field path", () => {
    const globals = makeGlobals();
    const data = createSchemaDataNode(
      personSchema(),
      globals.ctx.newControl({ name: "Bob", email: "bob@test.com", age: 25 }),
    );
    const def: ControlDefinition = {
      type: ControlDefinitionType.Data,
      field: "email",
    };
    const node = createFormStateNode(def, data, globals);
    const state = node.getState(rc);

    expect(state.dataNode!.control.valueNow).toBe("bob@test.com");

    node.cleanup();
  });
});

// ── Visibility tests ────────────────────────────────────────────────

describe("FormStateNode visibility", () => {
  it("hidden: true makes visible false", () => {
    const globals = makeGlobals();
    const data = createSchemaDataNode(
      personSchema(),
      globals.ctx.newControl({ name: "", email: "", age: 0 }),
    );
    const def: ControlDefinition = {
      type: ControlDefinitionType.Data,
      field: "name",
      hidden: true,
    };
    const node = createFormStateNode(def, data, globals);

    expect(node.getState(rc).visible).toBe(false);

    node.cleanup();
  });

  it("hidden: false makes visible true", () => {
    const globals = makeGlobals();
    const data = createSchemaDataNode(
      personSchema(),
      globals.ctx.newControl({ name: "", email: "", age: 0 }),
    );
    const def: ControlDefinition = {
      type: ControlDefinitionType.Data,
      field: "name",
      hidden: false,
    };
    const node = createFormStateNode(def, data, globals);

    expect(node.getState(rc).visible).toBe(true);

    node.cleanup();
  });

  it("forceHidden overrides definition", () => {
    const globals = makeGlobals();
    const data = createSchemaDataNode(
      personSchema(),
      globals.ctx.newControl({ name: "", email: "", age: 0 }),
    );
    const def: ControlDefinition = {
      type: ControlDefinitionType.Data,
      field: "name",
      hidden: false,
    };
    const node = createFormStateNode(def, data, globals, {
      forceHidden: true,
    });

    expect(node.getState(rc).visible).toBe(false);

    node.cleanup();
  });

  it("parent hidden cascades to children", () => {
    const globals = makeGlobals();
    const data = createSchemaDataNode(
      personSchema(),
      globals.ctx.newControl({ name: "", email: "", age: 0 }),
    );
    const def: ControlDefinition = {
      type: ControlDefinitionType.Group,
      hidden: true,
      children: [
        {
          type: ControlDefinitionType.Data,
          field: "name",
          hidden: false,
        },
      ],
    };
    const node = createFormStateNode(def, data, globals);

    expect(node.getState(rc).visible).toBe(false);
    const children = node.getChildren(rc);
    expect(children).toHaveLength(1);
    expect(children[0].getState(rc).visible).toBe(false);

    node.cleanup();
  });
});

// ── Disabled/Readonly cascade tests ─────────────────────────────────

describe("FormStateNode disabled/readonly", () => {
  it("definition disabled propagates", () => {
    const globals = makeGlobals();
    const data = createSchemaDataNode(
      personSchema(),
      globals.ctx.newControl({ name: "", email: "", age: 0 }),
    );
    const def: ControlDefinition = {
      type: ControlDefinitionType.Data,
      field: "name",
      disabled: true,
    };
    const node = createFormStateNode(def, data, globals);

    expect(node.getState(rc).disabled).toBe(true);

    node.cleanup();
  });

  it("parent disabled cascades to children", () => {
    const globals = makeGlobals();
    const data = createSchemaDataNode(
      personSchema(),
      globals.ctx.newControl({ name: "", email: "", age: 0 }),
    );
    const def: ControlDefinition = {
      type: ControlDefinitionType.Group,
      disabled: true,
      children: [
        { type: ControlDefinitionType.Data, field: "name" },
      ],
    };
    const node = createFormStateNode(def, data, globals);
    const children = node.getChildren(rc);

    expect(children[0].getState(rc).disabled).toBe(true);

    node.cleanup();
  });

  it("parent readonly cascades to children", () => {
    const globals = makeGlobals();
    const data = createSchemaDataNode(
      personSchema(),
      globals.ctx.newControl({ name: "", email: "", age: 0 }),
    );
    const def: ControlDefinition = {
      type: ControlDefinitionType.Group,
      readonly: true,
      children: [
        { type: ControlDefinitionType.Data, field: "name" },
      ],
    };
    const node = createFormStateNode(def, data, globals);
    const children = node.getChildren(rc);

    expect(children[0].getState(rc).readonly).toBe(true);

    node.cleanup();
  });

  it("disabled syncs to data control", () => {
    const globals = makeGlobals();
    const rootControl = globals.ctx.newControl({
      name: "",
      email: "",
      age: 0,
    });
    const data = createSchemaDataNode(personSchema(), rootControl);
    const def: ControlDefinition = {
      type: ControlDefinitionType.Data,
      field: "name",
      disabled: true,
    };
    const node = createFormStateNode(def, data, globals);
    const dn = node.getState(rc).dataNode!;

    expect(dn.control.disabledNow).toBe(true);

    node.cleanup();
  });
});

// ── Required validation ─────────────────────────────────────────────

describe("FormStateNode validation", () => {
  it("required field sets error when empty", () => {
    const globals = makeGlobals();
    const rootControl = globals.ctx.newControl({
      name: "",
      email: "",
      age: 0,
    });
    const data = createSchemaDataNode(personSchema(), rootControl);
    const def: ControlDefinition = {
      type: ControlDefinitionType.Data,
      field: "name",
      required: true,
      hidden: false,
    };
    const node = createFormStateNode(def, data, globals);
    const dn = node.getState(rc).dataNode!;

    expect(dn.control.errorNow).toBe("This field is required");

    node.cleanup();
  });

  it("required field clears error when non-empty", () => {
    const globals = makeGlobals();
    const rootControl = globals.ctx.newControl({
      name: "Alice",
      email: "",
      age: 0,
    });
    const data = createSchemaDataNode(personSchema(), rootControl);
    const def: ControlDefinition = {
      type: ControlDefinitionType.Data,
      field: "name",
      required: true,
      hidden: false,
    };
    const node = createFormStateNode(def, data, globals);
    const dn = node.getState(rc).dataNode!;

    expect(dn.control.errorNow).toBeFalsy();

    node.cleanup();
  });

  it("required validation disabled when not visible", () => {
    const globals = makeGlobals();
    const rootControl = globals.ctx.newControl({
      name: "",
      email: "",
      age: 0,
    });
    const data = createSchemaDataNode(personSchema(), rootControl);
    const def: ControlDefinition = {
      type: ControlDefinitionType.Data,
      field: "name",
      required: true,
      hidden: true,
    };
    const node = createFormStateNode(def, data, globals);
    const dn = node.getState(rc).dataNode!;

    // When hidden, validation should not run
    expect(dn.control.errorNow).toBeFalsy();

    node.cleanup();
  });
});

// ── Default value tests ──────────────────────────────────────────────

describe("FormStateNode default values", () => {
  it("applies default value when visible and value is undefined", () => {
    const globals = makeGlobals();
    const rootControl = globals.ctx.newControl({
      name: undefined,
      email: "",
      age: 0,
    });
    const data = createSchemaDataNode(personSchema(), rootControl);
    const def: ControlDefinition = {
      type: ControlDefinitionType.Data,
      field: "name",
      hidden: false,
      defaultValue: "Default Name",
    };
    const node = createFormStateNode(def, data, globals);
    const dn = node.getState(rc).dataNode!;

    expect(dn.control.valueNow).toBe("Default Name");

    node.cleanup();
  });

  it("does not apply default when value exists", () => {
    const globals = makeGlobals();
    const rootControl = globals.ctx.newControl({
      name: "Alice",
      email: "",
      age: 0,
    });
    const data = createSchemaDataNode(personSchema(), rootControl);
    const def: ControlDefinition = {
      type: ControlDefinitionType.Data,
      field: "name",
      hidden: false,
      defaultValue: "Default Name",
    };
    const node = createFormStateNode(def, data, globals);
    const dn = node.getState(rc).dataNode!;

    expect(dn.control.valueNow).toBe("Alice");

    node.cleanup();
  });
});

// ── Clear hidden tests ──────────────────────────────────────────────

describe("FormStateNode clear hidden", () => {
  it("clears value when hidden and clearHidden is true", () => {
    const globals = makeGlobals({ clearHidden: true });
    const rootControl = globals.ctx.newControl({
      name: "Alice",
      email: "",
      age: 0,
    });
    const data = createSchemaDataNode(personSchema(), rootControl);
    const def: ControlDefinition = {
      type: ControlDefinitionType.Data,
      field: "name",
      hidden: true,
    };
    const node = createFormStateNode(def, data, globals);
    const nameControl = rootControl.fields.name;

    expect(nameControl.valueNow).toBeUndefined();

    node.cleanup();
  });

  it("does not clear when dontClearHidden is set", () => {
    const globals = makeGlobals({ clearHidden: true });
    const rootControl = globals.ctx.newControl({
      name: "Alice",
      email: "",
      age: 0,
    });
    const data = createSchemaDataNode(personSchema(), rootControl);
    const def: ControlDefinition = {
      type: ControlDefinitionType.Data,
      field: "name",
      hidden: true,
      dontClearHidden: true,
    };
    const node = createFormStateNode(def, data, globals);
    const nameControl = rootControl.fields.name;

    expect(nameControl.valueNow).toBe("Alice");

    node.cleanup();
  });
});

// ── Children lifecycle tests ─────────────────────────────────────────

describe("FormStateNode children", () => {
  it("creates children from definition", () => {
    const globals = makeGlobals();
    const data = createSchemaDataNode(
      personSchema(),
      globals.ctx.newControl({ name: "Alice", email: "a@b.com", age: 30 }),
    );
    const def: ControlDefinition = {
      type: ControlDefinitionType.Group,
      children: [
        { type: ControlDefinitionType.Data, field: "name", title: "Name" },
        {
          type: ControlDefinitionType.Data,
          field: "email",
          title: "Email",
        },
      ],
    };
    const node = createFormStateNode(def, data, globals);
    const children = node.getChildren(rc);

    expect(children).toHaveLength(2);
    expect(children[0].getState(rc).dataNode!.control.valueNow).toBe(
      "Alice",
    );
    expect(children[1].getState(rc).dataNode!.control.valueNow).toBe(
      "a@b.com",
    );

    node.cleanup();
  });

  it("nested groups resolve data context", () => {
    const schema: SchemaField = {
      type: FieldType.Compound,
      field: "",
      children: [
        {
          type: FieldType.Compound,
          field: "address",
          children: [
            { type: FieldType.String, field: "city" },
            { type: FieldType.String, field: "zip" },
          ],
        },
      ],
    };
    const globals = makeGlobals();
    const data = createSchemaDataNode(
      schema,
      globals.ctx.newControl({
        address: { city: "NYC", zip: "10001" },
      }),
    );
    const def: ControlDefinition = {
      type: ControlDefinitionType.Group,
      compoundField: "address",
      children: [
        { type: ControlDefinitionType.Data, field: "city", title: "City" },
      ],
    };
    const node = createFormStateNode(def, data, globals);
    const children = node.getChildren(rc);

    expect(children).toHaveLength(1);
    expect(children[0].getState(rc).dataNode!.control.valueNow).toBe(
      "NYC",
    );

    node.cleanup();
  });
});

// ── onlyForTypes conditional visibility ─────────────────────────────

describe("FormStateNode onlyForTypes", () => {
  it("hides field when type does not match", () => {
    const schema: SchemaField = {
      type: FieldType.Compound,
      field: "",
      children: [
        { type: FieldType.String, field: "type", isTypeField: true },
        { type: FieldType.String, field: "name" },
        {
          type: FieldType.String,
          field: "companyName",
          onlyForTypes: ["company"],
        },
      ],
    };
    const globals = makeGlobals();
    const data = createSchemaDataNode(
      schema,
      globals.ctx.newControl({ type: "person", name: "Alice", companyName: "ACME" }),
    );
    const def: ControlDefinition = {
      type: ControlDefinitionType.Data,
      field: "companyName",
      hidden: false,
    };
    const node = createFormStateNode(def, data, globals);

    expect(node.getState(rc).visible).toBe(false);

    node.cleanup();
  });

  it("shows field when type matches", () => {
    const schema: SchemaField = {
      type: FieldType.Compound,
      field: "",
      children: [
        { type: FieldType.String, field: "type", isTypeField: true },
        {
          type: FieldType.String,
          field: "companyName",
          onlyForTypes: ["company"],
        },
      ],
    };
    const globals = makeGlobals();
    const data = createSchemaDataNode(
      schema,
      globals.ctx.newControl({ type: "company", companyName: "ACME" }),
    );
    const def: ControlDefinition = {
      type: ControlDefinitionType.Data,
      field: "companyName",
      hidden: false,
    };
    const node = createFormStateNode(def, data, globals);

    expect(node.getState(rc).visible).toBe(true);

    node.cleanup();
  });
});
