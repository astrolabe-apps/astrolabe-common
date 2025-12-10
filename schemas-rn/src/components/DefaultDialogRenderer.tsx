import { DefaultDialogRenderOptions } from "../rendererOptions";
import {
  ControlActionHandler,
  createGroupRenderer,
  deepMerge,
  DialogRenderOptions,
  FormRenderer,
  GroupRendererProps,
  GroupRenderType,
} from "@react-typed-forms/schemas";
import {
  Platform,
  TouchableOpacity,
  useWindowDimensions,
  View,
  ScrollView,
} from "react-native";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "./RNDialog";
import { useControl, useControlEffect } from "@react-typed-forms/core";
import { useMemo } from "react";
import { cn } from "../utils";
import * as React from "react";
import { FontAwesome6 } from "@expo/vector-icons";

export const defaultRNDialogOptions = {
  classes: {
    className: "",
    titleClass: "flex-1 flex-shrink title2",
    containerClass: "w-full px-[16px]",
  },
} satisfies DefaultDialogRenderOptions;

export function createDialogRenderer(options?: DefaultDialogRenderOptions) {
  return createGroupRenderer(
    (props, renderers) => (
      <DefaultDialogRenderer
        props={props}
        options={options}
        renderer={renderers}
        renderOptions={props.renderOptions as DialogRenderOptions}
      />
    ),
    {
      renderType: GroupRenderType.Dialog,
    },
  );
}

export function DefaultDialogRenderer({
  props,
  options,
  renderOptions,
  renderer,
}: {
  props: GroupRendererProps;
  options?: DefaultDialogRenderOptions;
  renderOptions: DialogRenderOptions;
  renderer: FormRenderer;
}) {
  const {
    classes: { containerClass, className, titleClass },
  } = deepMerge(
    options as typeof defaultRNDialogOptions,
    defaultRNDialogOptions,
  );

  const dialogOpen = useControl(false);
  const { width } = useWindowDimensions();
  const maxWidth = useMemo(() => Math.min(width - 32, 1024), [width]);

  const actionOnClick: ControlActionHandler = (action) => {
    switch (action) {
      case "closeDialog":
        return () => {
          dialogOpen.value = false;
        };

      case "openDialog":
        return () => {
          dialogOpen.value = true;
        };
    }
  };

  const allChildren = props.formNode.children;
  const triggerChildren = allChildren.filter(
    (x) => x.definition.placement === "trigger",
  );

  const { title, portalHost } = renderOptions;

  return (
    <Dialog
      open={dialogOpen.value}
      onOpenChange={(o) => {
        dialogOpen.value = o;
      }}
    >
      {triggerChildren.map((x) => props.renderChild(x, { actionOnClick }))}
      <DialogContent
        closeOnOutsidePress={false}
        className={cn("min-w-[200px] min-h-[200px] z-10", containerClass)}
        style={{ maxWidth }}
        portalHost={Platform.select({
          ios: portalHost?.trim() ? portalHost : undefined,
        })}
      >
        <View
          className={
            "flex flex-row gap-[10px] justify-between items-start w-full"
          }
        >
          <DialogTitle asChild className={titleClass}>
            {title}
          </DialogTitle>
          <DialogClose className={"rounded-sm"} asChild>
            <TouchableOpacity>
              <FontAwesome6 name="xmark-circle" size={24} color={"#267151"} />
            </TouchableOpacity>
          </DialogClose>
        </View>
        <ScrollView persistentScrollbar={true}>
          <View
            className={"flex flex-col gap-[12px]"}
            onStartShouldSetResponder={() => true}
          >
            {allChildren
              .filter(
                (x) =>
                  !x.definition.placement ||
                  x.definition.placement === "dialog",
              )
              .map((x, i) => props.renderChild(x, { actionOnClick }))}
          </View>
        </ScrollView>
      </DialogContent>
    </Dialog>
  );
}
