import { cssInterop } from "nativewind";
import { FontAwesome5 } from "@expo/vector-icons";

export type RNIconProps = {
  name: string;
  className?: string;
};

cssInterop(FontAwesome5, {
  className: {
    target: "style",
    nativeStyleToProp: {},
  },
});
export function FontAwesomeIcon({
  name,
  className = "!text-[16px] text-black-500",
}: RNIconProps) {
  return <FontAwesome5 name={name} className={className} />;
}
