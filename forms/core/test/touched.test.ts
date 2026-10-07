import { describe, expect, it } from "@jest/globals";
import { Control } from "@react-typed-forms/core";
import {
  compoundField,
  dataControl,
  DataRenderType,
  FormStateNode,
  groupedControl,
  stringField,
} from "../src";
import { testNodeState } from "./nodeTester";

const docField = (name: string) =>
  compoundField(name, [stringField("Type")("type")])(name);

// One compound holding the data for several wizard pages
const identityDocuments = compoundField("Identity Documents", [
  stringField("Question")("question"),
  docField("coiDoc"),
  docField("primaryDoc"),
])("identityDocuments");

const rows = compoundField("Rows", [stringField("Name")("name")], {
  collection: true,
})("rows");

const root = compoundField("Root", [identityDocuments, rows], {
  notNullable: true,
})("root");

const emptyData = {
  root: {
    identityDocuments: {
      question: "",
      coiDoc: { type: "" },
      primaryDoc: { type: "" },
    },
    rows: [],
  },
};

function rootData(state: FormStateNode): Control<any> {
  return state.parent.control.fields["root"];
}

function idDocs(state: FormStateNode): Control<any> {
  return rootData(state).fields.identityDocuments;
}

function dataGroup(children: ReturnType<typeof dataControl>[]) {
  return dataControl("identityDocuments", null, {
    renderOptions: { type: DataRenderType.Group },
    children,
  });
}

function page(...children: ReturnType<typeof dataControl>[]) {
  return groupedControl(children);
}

function rootNode(...pages: ReturnType<typeof groupedControl>[]) {
  return dataControl("root", null, {
    renderOptions: { type: DataRenderType.Group },
    children: pages,
  });
}

describe("touched follows the form tree", () => {
  it("Data(Group) node only touches the fields it renders", () => {
    const state = testNodeState(
      rootNode(page(dataGroup([dataControl("question")]))),
      root,
      { data: emptyData },
    );
    const pageNode = state.children[0];
    pageNode.setTouched(true);
    const docs = idDocs(state);
    expect(docs.touched).toBe(true);
    expect(docs.fields.question.touched).toBe(true);
    expect(docs.fields.coiDoc.touched).toBe(false);
    expect(docs.fields.coiDoc.fields.type.touched).toBe(false);
    expect(docs.fields.primaryDoc.fields.type.touched).toBe(false);
  });

  it("touching one wizard page leaves another page's fields untouched", () => {
    const state = testNodeState(
      rootNode(
        page(
          dataGroup([
            dataControl("coiDoc", null, { children: [dataControl("type")] }),
          ]),
        ),
        page(
          dataGroup([
            dataControl("primaryDoc", null, {
              children: [dataControl("type")],
            }),
          ]),
        ),
      ),
      root,
      { data: emptyData },
    );
    const [page1, page2] = state.children;
    page1.setTouched(true);
    const docs = idDocs(state);
    expect(docs.fields.coiDoc.fields.type.touched).toBe(true);
    expect(docs.fields.primaryDoc.touched).toBe(false);
    expect(docs.fields.primaryDoc.fields.type.touched).toBe(false);
    const page2Type = page2.children[0].children[0].children[0];
    expect(page2Type.dataNode!.control).toBe(
      docs.fields.primaryDoc.fields.type,
    );
    expect(page2Type.touched).toBe(false);
    // the shared compound's Data node on page 2 picks up the compound's touched
    expect(page2.children[0].touched).toBe(true);
  });

  it("Data node without child form nodes only touches its own control", () => {
    const state = testNodeState(
      rootNode(page(dataControl("identityDocuments"))),
      root,
      { data: emptyData },
    );
    const dataNode = state.children[0].children[0];
    expect(dataNode.getChildCount()).toBe(0);
    state.children[0].setTouched(true);
    const docs = idDocs(state);
    expect(docs.touched).toBe(true);
    expect(docs.fields.question.touched).toBe(false);
    expect(docs.fields.coiDoc.fields.type.touched).toBe(false);
  });

  it("collection rows touch through their own form nodes", () => {
    const state = testNodeState(
      rootNode(
        page(dataControl("rows", null, { children: [dataControl("name")] })),
      ),
      root,
      { data: { root: { ...emptyData.root, rows: [{ name: "" }] } } },
    );
    const pageNode = state.children[0];
    const rowsNode = pageNode.children[0];
    const rowsControl = rootData(state).fields.rows;
    pageNode.setTouched(true);
    expect(rowsControl.touched).toBe(true);
    expect(rowsControl.elements[0].fields.name.touched).toBe(true);
    // a single child definition becomes the row node itself
    expect(rowsNode.children[0].touched).toBe(true);
  });

  it("collection rows added after touching start untouched", () => {
    const state = testNodeState(
      rootNode(
        page(dataControl("rows", null, { children: [dataControl("name")] })),
      ),
      root,
      { data: emptyData },
    );
    const pageNode = state.children[0];
    const rowsNode = pageNode.children[0];
    const rowsControl = rootData(state).fields.rows;
    pageNode.setTouched(true);
    rowsControl.value = [{ name: "" }];
    const rowNode = rowsNode.children[0];
    expect(rowsControl.elements[0].touched).toBe(false);
    expect(rowNode.touched).toBe(false);
    expect(rowNode.dataNode!.control.touched).toBe(false);
  });

  it("control -> node sync only touches the immediate form node", () => {
    const state = testNodeState(
      rootNode(page(dataGroup([dataControl("question")]))),
      root,
      { data: emptyData },
    );
    const groupNode = state.children[0].children[0];
    const questionNode = groupNode.children[0];
    const docs = idDocs(state);
    docs.setTouched(true, true);
    expect(groupNode.touched).toBe(true);
    expect(questionNode.touched).toBe(false);
    docs.fields.question.touched = true;
    expect(questionNode.touched).toBe(true);
    docs.touched = false;
    expect(groupNode.touched).toBe(false);
    expect(questionNode.touched).toBe(false);
  });

  it("untouching a page untouches the data it rendered", () => {
    const state = testNodeState(
      rootNode(page(dataGroup([dataControl("question")]))),
      root,
      { data: emptyData },
    );
    const pageNode = state.children[0];
    const docs = idDocs(state);
    pageNode.setTouched(true);
    pageNode.setTouched(false);
    expect(docs.touched).toBe(false);
    expect(docs.fields.question.touched).toBe(false);
  });
});
