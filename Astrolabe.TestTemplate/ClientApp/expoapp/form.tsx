import {
  boolField,
  buildSchema,
  compoundField,
  dateField,
  dateTimeField,
  doubleField,
  intField,
  SchemaTags,
  stringField,
  stringOptionsField,
  timeField,
  withScalarOptions,
} from "@react-typed-forms/schemas";

interface DisabledStuff {
  // type: string;
  // disable: boolean;
  text: string;
  // options: string[];
  singleOption: string;
}

interface NestedSchema {
  data: string;
}
interface TestSchema {
  // date: string;
  // dateTime: string;
  // time: string;
  // array: number[];
  stuff: DisabledStuff[];
  // number: number;
  // nested: NestedSchema;
}

export const TestSchema = buildSchema<TestSchema>({
  // date: dateField("Date", { required: true }),
  // dateTime: dateTimeField("Date Time"),
  // time: timeField("Time", { tags: [SchemaTags.ControlGroup + "Nested"] }),
  // array: intField("Numbers", { collection: true }),
  stuff: compoundField(
    "Stuff",
    buildSchema<DisabledStuff>({
      // type: withScalarOptions(
      //   { isTypeField: true },
      //   stringOptionsField("Type", { name: "Some", value: "some" }),
      // ),
      // disable: boolField("Disable", {
      //   onlyForTypes: ["some"],
      //   tags: [SchemaTags.ControlGroup + "Root"],
      // }),
      text: stringField("Pure Text"),
      // options: withScalarOptions(
      //   { collection: true },
      //   stringOptionsField(
      //     "String",
      //     {
      //       name: "The Shawshank Redemption",
      //       value: "The Shawshank Redemption",
      //       group: "Drama",
      //     },
      //     { name: "The Godfather", value: "The Godfather", group: "Crime" },
      //     {
      //       name: "The Dark Knight",
      //       value: "The Dark Knight",
      //       group: "Action",
      //     },
      //     { name: "12 Angry Men", value: "12 Angry Men", group: "Drama" },
      //     {
      //       name: "Schindler's List",
      //       value: "Schindler's List",
      //       group: "Biography",
      //     },
      //     {
      //       name: "The Lord of the Rings: The Return of the King",
      //       value: "The Lord of the Rings: The Return of the King",
      //       group: "Adventure",
      //     },
      //     { name: "Pulp Fiction", value: "Pulp Fiction", group: "Crime" },
      //     {
      //       name: "The Good, the Bad and the Ugly",
      //       value: "The Good, the Bad and the Ugly",
      //       group: "Western",
      //     },
      //     { name: "Fight Club", value: "Fight Club", group: "Drama" },
      //     { name: "Forrest Gump", value: "Forrest Gump", group: "Drama" },
      //     { name: "Inception", value: "Inception", group: "Action" },
      //     { name: "The Matrix", value: "The Matrix", group: "Sci-Fi" },
      //     { name: "Goodfellas", value: "Goodfellas", group: "Biography" },
      //     {
      //       name: "The Empire Strikes Back",
      //       value: "The Empire Strikes Back",
      //       group: "Adventure",
      //     },
      //     {
      //       name: "One Flew Over the Cuckoo's Nest",
      //       value: "One Flew Over the Cuckoo's Nest",
      //       group: "Drama",
      //     },
      //     { name: "Interstellar", value: "Interstellar", group: "Adventure" },
      //     { name: "City of God", value: "City of God", group: "Crime" },
      //     { name: "Se7en", value: "Se7en", group: "Crime" },
      //     {
      //       name: "The Silence of the Lambs",
      //       value: "The Silence of the Lambs",
      //       group: "Thriller",
      //     },
      //     {
      //       name: "It's a Wonderful Life",
      //       value: "It's a Wonderful Life",
      //       group: "Drama",
      //     },
      //     {
      //       name: "Life Is Beautiful",
      //       value: "Life Is Beautiful",
      //       group: "Comedy",
      //     },
      //     {
      //       name: "The Usual Suspects",
      //       value: "The Usual Suspects",
      //       group: "Crime",
      //     },
      //     {
      //       name: "Léon: The Professional",
      //       value: "Léon: The Professional",
      //       group: "Crime",
      //     },
      //     {
      //       name: "Saving Private Ryan",
      //       value: "Saving Private Ryan",
      //       group: "Drama",
      //     },
      //     { name: "Spirited Away", value: "Spirited Away", group: "Animation" },
      //     { name: "The Green Mile", value: "The Green Mile", group: "Crime" },
      //     { name: "Parasite", value: "Parasite", group: "Thriller" },
      //     { name: "The Pianist", value: "The Pianist", group: "Biography" },
      //     { name: "Gladiator", value: "Gladiator", group: "Action" },
      //     { name: "The Lion King", value: "The Lion King", group: "Animation" },
      //   ),
      // ),
      singleOption: stringOptionsField(
        "String",
        { name: "One", value: "1", group: "Less Than 5" },
        { name: "Two", value: "2", group: "Less Than 5" },
        { name: "Three", value: "3", group: "Less Than 5" },
        { name: "Four", value: "4", group: "Less Than 5" },
        { name: "Five", value: "5" },
        { name: "Six", value: "6", group: "More Than 5" },
        { name: "Seven", value: "7", group: "More Than 5" },
        { name: "Eight", value: "8", group: "More Than 5" },
        { name: "Nine", value: "9", group: "More Than 5" },
      ),
    }),
    { collection: true },
  ),
  // number: doubleField("Double"),
  // nested: compoundField(
  //   "Nested",
  //   buildSchema<NestedSchema>({
  //     data: stringField("Data", { tags: [SchemaTags.ControlGroup + "Root"] }),
  //   }),
  // ),
});
