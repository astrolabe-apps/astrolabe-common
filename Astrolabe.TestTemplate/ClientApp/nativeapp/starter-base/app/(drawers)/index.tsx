import * as React from "react";
import { Dimensions, View } from "react-native";
import { ShowForm } from "~/form/ShowForm";
import MainScrollView from "~/components/layout/MainScrollView";
import { useControl } from "@react-typed-forms/core";
import { verifyInstallation } from "nativewind";

export default function Screen() {
  const screenWidth = useControl(Dimensions.get("window").width);
  return (
    <MainScrollView title={"Register a Burn"}>
      <View className="flex-1 justify-center items-center gap-5 bg-secondary/60 relative">
        <View
          className="flex-1 h-full bg-white my-4"
          style={{ top: -50, elevation: 2, width: screenWidth.value - 32 }}
        >
          <ShowForm />
        </View>
      </View>
    </MainScrollView>
  );
}
