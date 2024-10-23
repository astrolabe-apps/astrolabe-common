import { PropsWithChildren } from "react";
import Animated from "react-native-reanimated";
import Header from "~/components/layout/Header";
import Footer from "~/components/layout/Footer";
import { View } from "react-native";
type MainScrollViewProps = PropsWithChildren<{
  title: string;
}>;

export default function MainScrollView({
  children,
  title,
}: MainScrollViewProps) {
  return (
    <View className={"flex-1"}>
      <Animated.ScrollView>
        <Header title={title} />
        {children}
        <Footer />
      </Animated.ScrollView>
    </View>
  );
}
