import { cssInterop } from "nativewind";
import { FontAwesome } from "@expo/vector-icons";
import { IconLibrary } from "@react-typed-forms/schemas";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";

export type RNIconProps = {
  name: string;
  className?: string;
  iconLibrary?: IconLibrary;
};

cssInterop(FontAwesome, {
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

cssInterop(FontAwesomeIcon, {
  className: {
    target: "style",
    nativeStyleToProp: {
      fontSize: "size",
    },
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
    case IconLibrary.FontAwesome:
      return <FontAwesome name={name as any} className={className} />;
    case IconLibrary.CssClass:
      return undefined;
    default:
      return (
        <FontAwesomeIcon
          icon={toIconClass() as any}
          // @ts-ignore
          className={className}
        />
      );
  }

  function toIconClass() {
    return iconLibrary + " fa-" + name;
  }
}
