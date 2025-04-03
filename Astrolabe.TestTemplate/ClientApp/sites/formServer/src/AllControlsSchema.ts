import { buildSchema, stringField } from "@react-typed-forms/schemas";

interface ControlsData {
  data: string;
}

export const AllControlsSchema = buildSchema<ControlsData>({
  data: stringField("Hai"),
});
