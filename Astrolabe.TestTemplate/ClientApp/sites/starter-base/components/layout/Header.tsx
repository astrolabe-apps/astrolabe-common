import { View, Text } from "react-native";

export default function Header({ title }: { title: string }) {
  return (
    <View className={"flex flex-col bg-[#098851]"}>
      <Text className={"color-white py-16 px-8 text-4xl"}>{title}</Text>
    </View>
  );
}
