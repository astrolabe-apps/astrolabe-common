import { ReactNode, useContext, useState } from "react";
import { AppContext } from "./index";

export interface ToastService {
  addToast(text: ReactNode, settings?: ToastSettings): void;
}

export interface ToastServiceContext {
  toasts: ToastService;
}

export function useToast(): ToastService {
  const sc = useContext(AppContext).toasts;
  if (!sc) throw "No ToastService present";
  return sc;
}

export type ToastType = "info" | "success" | "warning" | "error";

export interface Toast {
  /** Provide the toast message. */
  title: ReactNode;
  settings: ToastSettings;
}
export interface ToastSettings {
  type?: ToastType;
  message?: string;
  action?: {
    label: string;
    /** The function triggered when the button is pressed. */
    response: () => void;
  };
}

export function useActionPerformer(): [
  (action: Promise<string>) => void,
  boolean,
  (pa: boolean) => void,
] {
  const toasts = useToast();
  const [performingAction, setPerformingAction] = useState(false);
  return [
    (action) => {
      setPerformingAction(true);
      action.then(
        (msg) => {
          setPerformingAction(false);
          toasts.addToast(msg, {
            type: "success",
          });
        },
        (reason) => {
          setPerformingAction(false);
          toasts.addToast("Unexpected error: " + reason, {
            type: "error",
          });
        },
      );
    },
    performingAction,
    setPerformingAction,
  ];
}
