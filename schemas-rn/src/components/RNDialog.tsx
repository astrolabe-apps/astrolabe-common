import * as DialogPrimitive from "@rn-primitives/dialog";
import * as React from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { cn } from "../utils";
import { Control, useControl } from "@react-typed-forms/core";
import { FontAwesome6 } from "@expo/vector-icons";
import { useMemo } from "react";

const Dialog = DialogPrimitive.Root;

const DialogTrigger = DialogPrimitive.Trigger;

const DialogPortal = DialogPrimitive.Portal;

const DialogClose = DialogPrimitive.Close;

const DialogOverlayWeb = React.forwardRef<
  DialogPrimitive.OverlayRef,
  DialogPrimitive.OverlayProps
>(({ className, ...props }, ref) => {
  const { open } = DialogPrimitive.useRootContext();
  return (
    <DialogPrimitive.Overlay
      className={cn(
        "bg-black/80 flex justify-center items-center p-2 absolute top-0 right-0 bottom-0 left-0",
        open
          ? "web:animate-in web:fade-in-0"
          : "web:animate-out web:fade-out-0",
        className,
      )}
      {...props}
      ref={ref}
    />
  );
});

DialogOverlayWeb.displayName = "DialogOverlayWeb";

const DialogOverlayNative = React.forwardRef<
  DialogPrimitive.OverlayRef,
  DialogPrimitive.OverlayProps
>(({ className, children, ...props }, ref) => {
  return (
    <DialogPrimitive.Overlay
      style={StyleSheet.absoluteFill}
      className={cn(
        "flex bg-black/80 justify-center items-center p-2",
        className,
      )}
      {...props}
      ref={ref}
    >
      <Animated.View
        entering={FadeIn.duration(150)}
        exiting={FadeOut.duration(150)}
      >
        <Pressable>{children}</Pressable>
      </Animated.View>
    </DialogPrimitive.Overlay>
  );
});

DialogOverlayNative.displayName = "DialogOverlayNative";

const DialogOverlay = Platform.select({
  web: DialogOverlayWeb,
  default: DialogOverlayNative,
});

const DialogContent = React.forwardRef<
  DialogPrimitive.ContentRef,
  DialogPrimitive.ContentProps & {
    portalHost?: string;
    closeOnOutsidePress?: boolean;
  }
>(({ className, children, portalHost, closeOnOutsidePress, ...props }, ref) => {
  const { open } = DialogPrimitive.useRootContext();
  return (
    <DialogPortal hostName={portalHost}>
      <DialogOverlay closeOnPress={closeOnOutsidePress}>
        <DialogPrimitive.Content
          ref={ref}
          className={cn(
            "max-w-lg gap-4 border border-[#E7E7E8] web:cursor-default bg-white p-6 shadow-lg web:duration-200 rounded-lg",
            open
              ? "web:animate-in web:fade-in-0 web:zoom-in-95"
              : "web:animate-out web:fade-out-0 web:zoom-out-95",
            className,
          )}
          {...props}
        >
          {children}
        </DialogPrimitive.Content>
      </DialogOverlay>
    </DialogPortal>
  );
});
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogTitle = React.forwardRef<
  DialogPrimitive.TitleRef,
  DialogPrimitive.TitleProps
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title ref={ref} className={cn(className)} {...props} />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

export type RNDialogProps = {
  title: React.ReactNode;
  trigger?: React.ReactNode;
  content?: React.ReactNode;
  footer?: React.ReactNode;
  containerClass?: string;
  open?: Control<boolean>;
  onOpenChange?: (open: boolean) => void;
  closeOnOutsidePress?: boolean;
  portalHost?: string;
};

export function RNDialog({
  title,
  trigger,
  content,
  footer,
  open,
  onOpenChange,
  closeOnOutsidePress = false,
  containerClass,
  portalHost,
}: RNDialogProps) {
  const dialogOpen = open ?? useControl(false);
  const { width } = useWindowDimensions();

  const maxWidth = useMemo(() => Math.min(width - 32, 448), [width]);

  return (
    <Dialog
      open={dialogOpen.value}
      onOpenChange={(o) => {
        if (onOpenChange) {
          onOpenChange(o);
        } else {
          dialogOpen.value = o;
        }
      }}
    >
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent
        closeOnOutsidePress={closeOnOutsidePress}
        className={cn("min-w-[200px] min-h-[200px]", containerClass)}
        style={{ maxWidth }}
        portalHost={Platform.select({ ios: portalHost })}
      >
        <View
          className={
            "flex flex-row gap-[10px] justify-between items-start w-full"
          }
        >
          <DialogTitle asChild className={"flex-1 flex-shrink title2"}>
            {title}
          </DialogTitle>
          <DialogClose
            className={
              "web:group rounded-sm web:ring-offset-background web:transition-opacity web:hover:opacity-100 web:focus:outline-none web:focus:ring-2 web:focus:ring-ring web:focus:ring-offset-2 web:disabled:pointer-events-none"
            }
          >
            <FontAwesome6 name="xmark-circle" size={24} color={"#267151"} />
          </DialogClose>
        </View>
        {content}
        {footer}
      </DialogContent>
    </Dialog>
  );
}
