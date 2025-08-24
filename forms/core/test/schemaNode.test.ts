import { describe, expect, it } from "@jest/globals";
import fc from "fast-check";
import {
  CompoundField,
  createSchemaLookup,
  createSchemaTree,
  DataPathNode,
  FieldType,
  getParentDataPath,
  getSchemaNodePath,
  getSchemaNodePathString,
  isCompoundField,
  isCompoundNode,
  relativePath,
  relativeSegmentPath,
  resolveSchemaNode,
  SchemaField,
  schemaForDataPath,
  schemaForFieldPath,
  schemaForFieldRef,
  traverseData,
  traverseSchemaPath,
} from "../src";
import { arbitraryFieldName, randomSchemaField } from "./gen-schema";

// Arbitrary generators for testing
function arbitrarySchemaField(): fc.Arbitrary<SchemaField> {
  return randomSchemaField("testField", { maxDepth: 2 });
}

function arbitrarySchemaFields(): fc.Arbitrary<SchemaField[]> {
  return fc.array(
    fc.record({
      field: arbitraryFieldName(),
      type: fc.constantFrom(...Object.values(FieldType)),
      displayName: fc.string(),
    }) as fc.Arbitrary<SchemaField>,
    { minLength: 1, maxLength: 5 },
  );
}

function arbitraryCompoundField(): fc.Arbitrary<CompoundField> {
  return arbitrarySchemaFields().map(
    (children) =>
      ({
        field: "compound",
        type: FieldType.Compound,
        displayName: "Compound Field",
        children,
        collection: false,
      }) as CompoundField,
  );
}

describe("SchemaNode property tests", () => {
  describe("Schema tree creation and structure", () => {
    it("creates trees with correct hierarchy and child relationships", () => {
      fc.assert(
        fc.property(arbitraryCompoundField(), (compoundField) => {
          const tree = createSchemaTree([compoundField]);

          // Root node properties
          expect(tree.rootNode.id).toBe("");
          expect(tree.rootNode.field.type).toBe(FieldType.Compound);
          expect((tree.rootNode.field as CompoundField).children).toEqual([
            compoundField,
          ]);

          // Child node hierarchy
          const rootChild = tree.rootNode.getChildNodes()[0];
          const grandChildren = rootChild.getChildNodes();

          expect(rootChild.field).toEqual(compoundField);
          expect(rootChild.parent).toBe(tree.rootNode);
          expect(grandChildren).toHaveLength(compoundField.children.length);

          grandChildren.forEach((grandChild, index) => {
            expect(grandChild.parent).toBe(rootChild);
            // Compare only the core properties that should match
            expect(grandChild.field.field).toBe(
              compoundField.children[index].field,
            );
            expect(grandChild.field.type).toBe(
              compoundField.children[index].type,
            );
            expect(grandChild.field.displayName).toBe(
              compoundField.children[index].displayName,
            );
            expect(grandChild.id).toBe(
              `/${compoundField.field}/${compoundField.children[index].field}`,
            );
          });
        }),
      );
    });

    it("handles schema lookup with references and additional fields", () => {
      fc.assert(
        fc.property(
          fc.record({
            main: arbitrarySchemaFields(),
            referenced: arbitrarySchemaFields(),
            additional: arbitrarySchemaFields(),
          }),
          ({ main, referenced, additional }) => {
            const lookup = createSchemaLookup({ main, referenced });

            // Basic lookup functionality
            expect(lookup.getSchema("main").getResolvedFields()).toEqual(main);
            expect(lookup.getSchema("referenced").getResolvedFields()).toEqual(
              referenced,
            );

            // Additional fields support
            const treeWithAdditional = lookup.getSchemaTree("main", additional);
            expect(treeWithAdditional.rootNode.getResolvedFields()).toEqual([
              ...main,
              ...additional,
            ]);
          },
        ),
      );
    });
  });

  describe("Node field resolution and navigation", () => {
    it("resolves fields correctly including missing fields", () => {
      fc.assert(
        fc.property(
          arbitraryCompoundField(),
          arbitraryFieldName(),
          (compoundField, missingFieldName) => {
            const tree = createSchemaTree([compoundField]);
            const node = tree.rootNode.getChildNodes()[0];

            // Existing field resolution
            const existingField = node.getChildField(
              compoundField.children[0].field,
            );
            const existingNode = node.getChildNode(
              compoundField.children[0].field,
            );
            expect(existingField.field).toBe(compoundField.children[0].field);
            expect(existingField.type).toBe(compoundField.children[0].type);
            expect(existingNode.field.field).toBe(
              compoundField.children[0].field,
            );

            // Missing field handling
            const missingField = node.getChildField(missingFieldName);
            const missingNode = node.getChildNode(missingFieldName);
            if (
              !compoundField.children.some((f) => f.field === missingFieldName)
            ) {
              expect(missingField.field).toBe("__missing");
              expect(missingField.displayName).toBe(missingFieldName);
              expect(missingNode.field.field).toBe("__missing");
            }
          },
        ),
      );
    });

    it("handles special navigation tokens (., ..) correctly", () => {
      fc.assert(
        fc.property(arbitraryCompoundField(), (compoundField) => {
          const tree = createSchemaTree([compoundField]);
          const parentNode = tree.rootNode.getChildNodes()[0];
          const childNode = parentNode.getChildNodes()[0];

          // Self-reference
          expect(resolveSchemaNode(childNode, ".")).toBe(childNode);

          // Parent navigation
          expect(resolveSchemaNode(childNode, "..")).toBe(parentNode);

          // Root node parent navigation returns undefined
          expect(resolveSchemaNode(tree.rootNode, "..")).toBeUndefined();

          // Field name resolution
          const resolved = resolveSchemaNode(
            parentNode,
            compoundField.children[0].field,
          );
          expect(resolved!.field.field).toBe(compoundField.children[0].field);
          expect(resolved!.field.type).toBe(compoundField.children[0].type);
        }),
      );
    });
  });

  describe("Path operations and traversal", () => {
    it("handles field path navigation with missing field creation", () => {
      fc.assert(
        fc.property(
          fc.record({
            parent: arbitraryFieldName(),
            child: arbitraryFieldName(),
            missing: arbitraryFieldName(),
          }),
          ({ parent, child, missing }) => {
            fc.pre(parent !== child && child !== missing && parent !== missing);

            const childField: SchemaField = {
              field: child,
              type: FieldType.String,
              displayName: child,
            };
            const parentField: CompoundField = {
              field: parent,
              type: FieldType.Compound,
              displayName: parent,
              children: [childField],
            };

            const tree = createSchemaTree([parentField]);
            const rootNode = tree.rootNode;

            // Valid path navigation
            const validResult = schemaForFieldPath([parent, child], rootNode);
            expect(validResult.field.field).toBe(child);
            expect(validResult.field.type).toBe(FieldType.String);

            // Field reference with slashes
            const refResult = schemaForFieldRef(`${parent}/${child}`, rootNode);
            expect(refResult.field.field).toBe(child);
            expect(refResult.field.type).toBe(FieldType.String);

            // Missing field creation
            const missingResult = schemaForFieldPath([missing], rootNode);
            expect(missingResult.field.field).toBe("__missing");
            expect(missingResult.field.displayName).toBe(missing);

            // Undefined field reference
            const undefinedResult = schemaForFieldRef(undefined, validResult);
            expect(undefinedResult).toBe(validResult);
          },
        ),
      );
    });

    it("manages data paths with element tracking", () => {
      fc.assert(
        fc.property(
          fc.record({
            field: arbitraryFieldName(),
            collection: fc.boolean(),
          }),
          ({ field, collection }) => {
            const schemaField: SchemaField = {
              field,
              type: FieldType.String,
              displayName: field,
              collection,
            };

            const tree = createSchemaTree([schemaField]);
            const rootNode = tree.rootNode;

            // Data path with element tracking
            const dataPath = schemaForDataPath([field], rootNode);
            expect(dataPath.element).toBe(collection);

            // Parent data path navigation
            if (collection) {
              const elementPath: DataPathNode = {
                node: dataPath.node,
                element: true,
              };
              const parent = getParentDataPath(elementPath);
              expect(parent!.node).toBe(dataPath.node);
              expect(parent!.element).toBe(false);
            }

            // Special navigation tokens
            const selfPath = schemaForDataPath(["."], dataPath.node);
            expect(selfPath.node).toBe(dataPath.node);
          },
        ),
      );
    });

    it("performs path traversal with accumulation", () => {
      fc.assert(
        fc.property(
          fc.record({
            parent: arbitraryFieldName(),
            child: arbitraryFieldName(),
            value: fc.string(),
          }),
          ({ parent, child, value }) => {
            fc.pre(parent !== child);

            const childField: SchemaField = {
              field: child,
              type: FieldType.String,
              displayName: child,
            };
            const parentField: CompoundField = {
              field: parent,
              type: FieldType.Compound,
              displayName: parent,
              children: [childField],
            };

            const tree = createSchemaTree([parentField]);
            const rootNode = tree.rootNode;
            const data = { [parent]: { [child]: value } };

            // Schema path traversal with accumulation
            const pathLength = traverseSchemaPath(
              [parent, child],
              rootNode,
              0,
              (acc, node) => acc + node.field.field.length,
            );
            expect(pathLength).toBe(parent.length + child.length);

            // Data traversal
            const traversedValue = traverseData(
              [parent, child],
              rootNode,
              data,
            );
            expect(traversedValue).toBe(value);

            // Missing data path
            const missingValue = traverseData(
              [parent, "missing"],
              rootNode,
              data,
            );
            expect(missingValue).toBeUndefined();
          },
        ),
      );
    });
  });

  describe("Path utilities and relationships", () => {
    it("calculates node paths and relative paths correctly", () => {
      fc.assert(
        fc.property(arbitraryCompoundField(), (compoundField) => {
          const tree = createSchemaTree([compoundField]);
          const parentNode = tree.rootNode.getChildNodes()[0];
          const childNode = parentNode.getChildNodes()[0];

          // Node path calculation
          const parentPath = getSchemaNodePath(parentNode);
          const childPath = getSchemaNodePath(childNode);
          const rootPath = getSchemaNodePath(tree.rootNode);

          expect(rootPath).toEqual([""]);
          expect(parentPath).toEqual(["", compoundField.field]);
          expect(childPath).toEqual([
            "",
            compoundField.field,
            compoundField.children[0].field,
          ]);

          // Path string conversion
          expect(getSchemaNodePathString(parentNode)).toBe(
            `/${compoundField.field}`,
          );

          // Relative path calculation
          expect(relativePath(parentNode, parentNode)).toBe(".");
          expect(relativePath(parentNode, childNode)).toBe(
            compoundField.children[0].field,
          );
          expect(relativePath(childNode, parentNode)).toBe("../");

          // Segment path calculation
          expect(relativeSegmentPath(parentPath, parentPath)).toBe("");
          expect(relativeSegmentPath(parentPath, childPath)).toBe(
            compoundField.children[0].field,
          );
          expect(relativeSegmentPath(childPath, parentPath)).toBe("../");
        }),
      );
    });

    it("identifies compound nodes correctly", () => {
      fc.assert(
        fc.property(
          arbitraryCompoundField(),
          arbitrarySchemaField().filter((f) => !isCompoundField(f)),
          (compoundField, scalarField) => {
            const tree = createSchemaTree([compoundField, scalarField]);
            const compoundNode = tree.rootNode.getChildNodes()[0];
            const scalarNode = tree.rootNode.getChildNodes()[1];

            expect(isCompoundNode(compoundNode)).toBe(true);
            expect(isCompoundNode(scalarNode)).toBe(false);
          },
        ),
      );
    });
  });

  describe("Edge cases and consistency", () => {
    it("handles empty schemas and maintains operation consistency", () => {
      // Empty schema handling
      const emptyTree = createSchemaTree([]);
      expect(emptyTree.rootNode.getChildNodes()).toHaveLength(0);
      expect(emptyTree.rootNode.getResolvedFields()).toHaveLength(0);

      fc.assert(
        fc.property(arbitrarySchemaFields(), (fields) => {
          const tree1 = createSchemaTree(fields);
          const tree2 = createSchemaTree(fields);

          // Idempotent tree creation
          expect(tree1.rootNode.getResolvedFields()).toEqual(
            tree2.rootNode.getResolvedFields(),
          );

          // Consistent node creation
          const parent = tree1.rootNode;
          const field = fields[0];
          const child1 = parent.createChildNode(field);
          const child2 = parent.createChildNode(field);

          expect(child1.field).toEqual(child2.field);
          expect(child1.id).toBe(child2.id);
          expect(child1.parent).toBe(parent);
          expect(child2.parent).toBe(parent);
        }),
      );
    });

    it("handles complex nested structures and schema references", () => {
      fc.assert(
        fc.property(
          fc.record({
            mainSchema: arbitraryFieldName(),
            refSchema: arbitraryFieldName(),
            refFields: arbitrarySchemaFields(),
            level1: arbitraryFieldName(),
            level2: arbitraryFieldName(),
            level3: arbitraryFieldName(),
          }),
          ({ mainSchema, refSchema, refFields, level1, level2, level3 }) => {
            fc.pre(
              mainSchema !== refSchema &&
                level1 !== level2 &&
                level2 !== level3 &&
                level1 !== level3,
            );

            // Schema references
            const referencingField: CompoundField = {
              field: mainSchema,
              type: FieldType.Compound,
              displayName: mainSchema,
              children: [],
              schemaRef: refSchema,
            };

            const lookup = createSchemaLookup({
              main: [referencingField],
              [refSchema]: refFields,
            });

            const mainNode = lookup
              .getSchemaTree("main")
              .rootNode.getChildNode(mainSchema);
            expect(mainNode.getResolvedFields()).toEqual(refFields);

            // Deep nesting
            const level3Field: SchemaField = {
              field: level3,
              type: FieldType.String,
              displayName: level3,
            };
            const level2Field: CompoundField = {
              field: level2,
              type: FieldType.Compound,
              displayName: level2,
              children: [level3Field],
            };
            const level1Field: CompoundField = {
              field: level1,
              type: FieldType.Compound,
              displayName: level1,
              children: [level2Field],
            };

            const deepTree = createSchemaTree([level1Field]);
            const deepPath = [level1, level2, level3];
            const deepNode = schemaForFieldPath(deepPath, deepTree.rootNode);

            expect(deepNode.field.field).toBe(level3);
            expect(deepNode.field.type).toBe(FieldType.String);
            expect(getSchemaNodePath(deepNode).slice(-3)).toEqual(deepPath);

            // Path transitivity: root -> A -> B should equal root -> A/B
            const nodeAB_step = schemaForFieldPath(
              [level2],
              schemaForFieldPath([level1], deepTree.rootNode),
            );
            const nodeAB_direct = schemaForFieldPath(
              [level1, level2],
              deepTree.rootNode,
            );
            expect(nodeAB_step.field.field).toBe(nodeAB_direct.field.field);
            expect(nodeAB_step.field.type).toBe(nodeAB_direct.field.type);
          },
        ),
      );
    });
  });
});
