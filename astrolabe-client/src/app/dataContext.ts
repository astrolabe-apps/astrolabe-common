import { Control } from "@react-typed-forms/core";
import { Context, createContext } from "react";

export type DataContext<A> = {
  data: Control<A>;
  reload(): Promise<void>;
};

export function createDataContext<A>(): Context<DataContext<A> | undefined> {
  return createContext<DataContext<A> | undefined>(undefined);
}
