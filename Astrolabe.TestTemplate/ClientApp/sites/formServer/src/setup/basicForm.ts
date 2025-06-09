import {
  buildSchema,
  compoundField,
  intField,
  stringField,
} from "@astroapps/forms-core";
import { dataControl, groupedControl } from "@react-typed-forms/schemas";

interface TestChild {
  title: string;
}
export interface TestSchema {
  text: string;
  number: number;
  children: TestChild[];
}

export const SchemaFields = buildSchema<TestSchema>({
  text: stringField("Text"),
  number: intField("Number"),
  children: compoundField(
    "Children",
    buildSchema<TestChild>({ title: stringField("Title") }),
    { collection: true },
  ),
});

export const Form = [
  groupedControl([
    dataControl("text", undefined),
    dataControl("number", undefined),
    dataControl("children", undefined, {
      children: [dataControl("title", null, { required: true })],
    }),
  ]),
];
