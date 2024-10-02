import { Control } from "@react-typed-forms/core";
import { View } from "react-native";
import { Button } from "~/components/ui/button";
import { Text } from "~/components/ui/text";

export function FormPager({
  currentPage: cp,
  totalPages,
  validate,
}: {
  currentPage: Control<number>;
  totalPages: number;
  validate?: () => Promise<boolean>;
}) {
  const currentPage = cp.value;
  const lastPage = totalPages - 1 == currentPage;

  return (
    <View className="flex flex-row justify-between w-full p-4">
      {currentPage == 0 ? (
        <View></View>
      ) : (
        <Button
          onPress={() => {
            changePage(-1);
          }}
        >
          <Text>Prev</Text>
        </Button>
      )}
      {lastPage ? (
        <View></View>
      ) : (
        <Button
          onPress={async () => {
            await doValidate(() => changePage(1));
          }}
        >
          <Text>Next</Text>
        </Button>
      )}
    </View>
  );

  function changePage(dir: number) {
    cp.setValue((x) => x + dir);
  }

  async function doValidate(afterValidate?: () => void) {
    const valid = validate ? await validate() : true;
    if (valid && afterValidate) afterValidate();
  }
}
