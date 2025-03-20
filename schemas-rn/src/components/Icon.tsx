import { cssInterop } from "nativewind";
import { FontAwesome5 } from "@expo/vector-icons";
import { IconLibrary } from "@react-typed-forms/schemas";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

export type RNIconProps = {
  name: string;
  className?: string;
  iconLibrary?: IconLibrary;
};

cssInterop(FontAwesome5, {
  className: {
    target: "style",
    nativeStyleToProp: {},
  },
});

cssInterop(MaterialIcons, {
  className: {
    target: "style",
    nativeStyleToProp: {},
  },
});

export function Icon({
  name,
  className = "!text-[16px] text-black-500",
  iconLibrary,
}: RNIconProps) {
  switch (iconLibrary) {
    case IconLibrary.Material:
      return <MaterialIcons name={name as any} className={className} />;
    default:
      return <FontAwesome5 name={name} className={className} />;
  }
}
