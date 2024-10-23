import MainScrollView from "~/components/layout/MainScrollView";
import { Text } from "~/components/ui/text";

export default function TestScreen() {
  return (
    <MainScrollView title={"Test"}>
      <Text>Test Screen</Text>
    </MainScrollView>
  );
}
