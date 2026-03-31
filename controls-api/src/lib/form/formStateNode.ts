/**
 * FormStateNode — POC implementation using the new controls-api.
 *
 * A minimal subset of @astroapps/forms-core semantics:
 * - Computed visible/disabled/readonly with parent cascade
 * - Data node binding from definition field path
 * - Bidirectional touched sync with data control
 * - Error mirroring from data control
 * - Default value application / clear on hidden
 * - Required validation
 * - Child lifecycle management
 */

import type {
  Control,
  ControlContext,
  ReadContext,
  WriteContext,
} from "../types";
import { computed, effect } from "../computed";
import type { SubscriptionReconciler } from "../readContextImpl";
import { noopReadContext } from "../readContextImpl";
import {
  ControlDefinitionType,
  type ControlDefinition,
  type FormGlobalOptions,
  type FormNodeOptions,
  type FormStateNode,
  type FormStateNodeState,
  type SchemaDataNode,
} from "./types";
import { resolveFieldPath, isValidDataNode } from "./schemaDataNode";

interface ChildEntry {
  key: string;
  node: FormStateNodeImpl;
}

class FormStateNodeImpl implements FormStateNode {
  readonly stateControl: Control<FormStateNodeState>;
  private effects: SubscriptionReconciler[] = [];
  private childEntries: ChildEntry[] = [];

  constructor(
    readonly definition: ControlDefinition,
    readonly parentNode: FormStateNode | undefined,
    private parent: SchemaDataNode,
    private globals: FormGlobalOptions,
    private nodeOptions: FormNodeOptions,
    childIndex: number,
  ) {
    const ctx = globals.ctx;
    this.stateControl = ctx.newControl<FormStateNodeState>({
      visible: null,
      disabled: false,
      readonly: false,
      dataNode: undefined,
      children: [],
      childIndex,
    });

    this.initDataNode(ctx);
    this.initVisible(ctx);
    this.initReadonly(ctx);
    this.initDisabled(ctx);
    this.initSyncEffects(ctx);
    this.initValidation(ctx);
    this.initDefaultValue(ctx);
    this.initChildren(ctx);
  }

  private initDataNode(ctx: ControlContext) {
    const def = this.definition;
    const fieldPath =
      def.type === ControlDefinitionType.Data
        ? def.field
        : def.type === ControlDefinitionType.Group
          ? def.compoundField
          : undefined;

    if (fieldPath) {
      const dataNodeControl = this.stateControl.fields
        .dataNode as Control<any>;
      this.effects.push(
        computed(ctx, dataNodeControl, () =>
          resolveFieldPath(fieldPath, this.parent),
        ),
      );
    }
  }

  private initVisible(ctx: ControlContext) {
    const visibleControl = this.stateControl.fields.visible as Control<any>;
    this.effects.push(
      computed(ctx, visibleControl, (rc) => {
        if (this.nodeOptions.forceHidden) return false;
        if (this.parentNode) {
          const parentVisible = rc.getValue(
            this.parentNode.stateControl.fields.visible as Control<boolean | null>,
          );
          if (parentVisible === false) return false;
        }
        const dn = rc.getValue(this.stateControl.fields.dataNode as Control<SchemaDataNode | undefined>);
        if (dn && !isValidDataNode(dn, rc)) return false;
        return this.definition.hidden == null
          ? null
          : !this.definition.hidden;
      }),
    );
  }

  private initReadonly(ctx: ControlContext) {
    const readonlyControl = this.stateControl.fields
      .readonly as Control<any>;
    this.effects.push(
      computed(ctx, readonlyControl, (rc) => {
        if (this.parentNode) {
          const parentReadonly = rc.getValue(
            this.parentNode.stateControl.fields.readonly as Control<boolean>,
          );
          if (parentReadonly) return true;
        }
        return (
          this.nodeOptions.forceReadonly || !!this.definition.readonly
        );
      }),
    );
  }

  private initDisabled(ctx: ControlContext) {
    const disabledControl = this.stateControl.fields
      .disabled as Control<any>;
    this.effects.push(
      computed(ctx, disabledControl, (rc) => {
        if (this.parentNode) {
          const parentDisabled = rc.getValue(
            this.parentNode.stateControl.fields.disabled as Control<boolean>,
          );
          if (parentDisabled) return true;
        }
        return (
          this.nodeOptions.forceDisabled || !!this.definition.disabled
        );
      }),
    );
  }

  private initSyncEffects(ctx: ControlContext) {
    // Sync disabled → data control
    this.effects.push(
      effect(ctx, (rc) => {
        const dn = rc.getValue(
          this.stateControl.fields.dataNode as Control<
            SchemaDataNode | undefined
          >,
        );
        if (dn) {
          const disabled = rc.getValue(
            this.stateControl.fields.disabled as Control<boolean>,
          );
          ctx.update((wc) => wc.setDisabled(dn.control, disabled));
        }
      }),
    );

    // Sync touched: form state → data control
    this.effects.push(
      effect(ctx, (rc) => {
        const dn = rc.getValue(
          this.stateControl.fields.dataNode as Control<
            SchemaDataNode | undefined
          >,
        );
        if (dn) {
          const touched = rc.isTouched(this.stateControl);
          ctx.update((wc) => wc.setTouched(dn.control, touched));
        }
      }),
    );

    // Sync touched: data control → form state
    this.effects.push(
      effect(ctx, (rc) => {
        const dn = rc.getValue(
          this.stateControl.fields.dataNode as Control<
            SchemaDataNode | undefined
          >,
        );
        if (dn) {
          const dataTouched = rc.isTouched(dn.control);
          ctx.update((wc) =>
            wc.setTouched(this.stateControl, dataTouched),
          );
        }
      }),
    );

    // Mirror errors from data control
    this.effects.push(
      effect(ctx, (rc) => {
        const dn = rc.getValue(
          this.stateControl.fields.dataNode as Control<
            SchemaDataNode | undefined
          >,
        );
        if (dn) {
          const errors = rc.getErrors(dn.control);
          ctx.update((wc) => wc.setErrors(this.stateControl, errors));
        } else {
          ctx.update((wc) => wc.setErrors(this.stateControl, null));
        }
      }),
    );
  }

  private initValidation(ctx: ControlContext) {
    if (
      this.definition.type !== ControlDefinitionType.Data ||
      !this.definition.required
    )
      return;

    const isEmptyValue =
      this.globals.isEmptyValue ?? ((_, v) => v == null || v === "");

    this.effects.push(
      effect(ctx, (rc) => {
        const visible = rc.getValue(
          this.stateControl.fields.visible as Control<boolean | null>,
        );
        const dn = rc.getValue(
          this.stateControl.fields.dataNode as Control<
            SchemaDataNode | undefined
          >,
        );
        if (!visible || !dn) return;
        const value = rc.getValue(dn.control);
        const error = isEmptyValue(dn.schema, value)
          ? "This field is required"
          : undefined;
        ctx.update((wc) => wc.setError(dn.control, "default", error));
      }),
    );
  }

  private initDefaultValue(ctx: ControlContext) {
    if (this.definition.type !== ControlDefinitionType.Data) return;

    this.effects.push(
      effect(ctx, (rc) => {
        const dn = rc.getValue(
          this.stateControl.fields.dataNode as Control<
            SchemaDataNode | undefined
          >,
        );
        if (!dn) return;

        const visible = rc.getValue(
          this.stateControl.fields.visible as Control<boolean | null>,
        );
        const value = rc.getValue(dn.control);

        if (visible === false) {
          if (
            this.globals.clearHidden &&
            !this.definition.dontClearHidden
          ) {
            ctx.update((wc) => wc.setValue(dn.control, undefined));
          }
        } else if (
          visible &&
          value === undefined &&
          this.definition.defaultValue != null
        ) {
          ctx.update((wc) =>
            wc.setValue(dn.control, this.definition.defaultValue),
          );
        }
      }),
    );
  }

  private initChildren(ctx: ControlContext) {
    const childDefs = this.definition.children;
    if (!childDefs || childDefs.length === 0) return;

    // For now, simple static children resolution
    this.effects.push(
      effect(ctx, (rc) => {
        const dn = rc.getValue(
          this.stateControl.fields.dataNode as Control<
            SchemaDataNode | undefined
          >,
        );
        const dataContext = dn ?? this.parent;

        // Build new child list
        const newKeys = childDefs.map((d, i) => this.childKey(d, i));

        // Check which existing children can be reused
        const oldMap = new Map(
          this.childEntries.map((e) => [e.key, e]),
        );
        const newEntries: ChildEntry[] = [];

        for (let i = 0; i < childDefs.length; i++) {
          const key = newKeys[i];
          const existing = oldMap.get(key);
          if (existing) {
            // Reuse — update child index
            ctx.update((wc) =>
              wc.setValue(
                existing.node.stateControl.fields
                  .childIndex as Control<number>,
                i,
              ),
            );
            newEntries.push(existing);
            oldMap.delete(key);
          } else {
            // Create new child
            const childNode = new FormStateNodeImpl(
              childDefs[i],
              this,
              dataContext,
              this.globals,
              {
                forceReadonly: false,
                forceDisabled: false,
                forceHidden: false,
              },
              i,
            );
            newEntries.push({ key, node: childNode });
          }
        }

        // Cleanup removed children
        for (const removed of oldMap.values()) {
          removed.node.cleanup();
        }

        this.childEntries = newEntries;

        // Update the children control
        ctx.update((wc) =>
          wc.setValue(
            this.stateControl.fields.children as Control<
              FormStateNodeState[]
            >,
            newEntries.map((e) => e.node.stateControl.valueNow),
          ),
        );
      }),
    );
  }

  private childKey(def: ControlDefinition, index: number): string {
    return def.field ?? def.compoundField ?? `child_${index}`;
  }

  getDefinition(_rc: ReadContext): ControlDefinition {
    // POC: return static definition. Full impl would use scripted proxy.
    return this.definition;
  }

  getState(rc: ReadContext): FormStateNodeState {
    // Read each field reactively through the ReadContext
    const fields = this.stateControl.fields as any;
    return {
      visible: rc.getValue(fields.visible),
      disabled: rc.getValue(fields.disabled),
      readonly: rc.getValue(fields.readonly),
      dataNode: rc.getValue(fields.dataNode),
      children: rc.getValue(fields.children),
      childIndex: rc.getValue(fields.childIndex),
    };
  }

  getChildren(rc: ReadContext): FormStateNode[] {
    return this.childEntries.map((e) => e.node);
  }

  cleanup(): void {
    for (const eff of this.effects) {
      eff.cleanup();
    }
    this.effects = [];
    for (const child of this.childEntries) {
      child.node.cleanup();
    }
    this.childEntries = [];
  }
}

// ── Public API ───────────────────────────────────────────────────────

export function createFormStateNode(
  definition: ControlDefinition,
  parent: SchemaDataNode,
  globals: FormGlobalOptions,
  options?: FormNodeOptions,
): FormStateNode {
  return new FormStateNodeImpl(
    definition,
    undefined,
    parent,
    globals,
    options ?? { forceReadonly: false, forceDisabled: false, forceHidden: false },
    0,
  );
}
