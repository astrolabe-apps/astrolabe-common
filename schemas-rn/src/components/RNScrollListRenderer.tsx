import { DefaultScrollListOptions } from "@react-typed-forms/schemas-html/lib/components/ScrollListRenderer";
import {
  createDataRenderer,
  DataRendererProps,
  DataRenderType,
  FormRenderer,
  FormStateNode,
  getHasMoreControl,
  getLoadingControl,
  getRefreshingControl,
  NoOpControlActionContext,
  ScrollListRenderOptions,
} from "@react-typed-forms/schemas";
import { ActivityIndicator, RefreshControl, Text, View } from "react-native";
import { isValidElement, ReactElement } from "react";
import Animated, { LinearTransition } from "react-native-reanimated";

export interface ExtendedDefaultScrollListOptions
  extends DefaultScrollListOptions {
  itemGap?: number;
  contentContainerClassName?: string;
  refreshControlTintColor?: string;
}

export function createRNScrollListRenderer(
  options: ExtendedDefaultScrollListOptions = {},
) {
  return createDataRenderer(
    (p, renderer) => (
      <RNScrollListRenderer
        dataProps={p}
        renderer={renderer}
        options={options}
      />
    ),
    {
      collection: true,
      renderType: DataRenderType.ScrollList,
    },
  );
}

function RNScrollListRenderer({
  dataProps: {
    formNode,
    renderChild,
    dataNode,
    actionOnClick,
    renderOptions,
    dataContext,
    className,
  },
  renderer,
  options,
}: {
  dataProps: DataRendererProps;
  renderer: FormRenderer;
  options: ExtendedDefaultScrollListOptions;
}) {
  const elements = formNode.children;
  const { itemGap, contentContainerClassName, refreshControlTintColor } =
    options;

  const { bottomActionId, refreshActionId } =
    renderOptions as ScrollListRenderOptions;
  const loadingControl = getLoadingControl(dataNode.control);
  const hasMoreControl = getHasMoreControl(dataNode.control);
  const refreshingControl = getRefreshingControl(dataNode.control);
  const handleLoadMore = bottomActionId
    ? actionOnClick?.(bottomActionId, undefined, dataContext)
    : undefined;
  const handleRefresh = refreshActionId
    ? actionOnClick?.(refreshActionId, undefined, dataContext)
    : undefined;

  return (
    <Animated.FlatList
      refreshControl={
        <RefreshControl
          refreshing={refreshingControl.value}
          onRefresh={() => {
            if (loadingControl.value) return;
            handleRefresh?.(NoOpControlActionContext);
          }}
          colors={
            refreshControlTintColor ? [refreshControlTintColor] : undefined
          }
          tintColor={refreshControlTintColor}
        />
      }
      renderItem={({ item }) => renderItem(item)}
      data={elements}
      style={{ flex: 1 }}
      contentContainerClassName={contentContainerClassName}
      ItemSeparatorComponent={() =>
        !!itemGap && <View style={{ height: itemGap }}></View>
      }
      showsVerticalScrollIndicator={false}
      onEndReachedThreshold={0.4}
      onEndReached={() => {
        if (!hasMoreControl.value || loadingControl.value) return;
        handleLoadMore?.(NoOpControlActionContext);
      }}
      keyExtractor={(item) => item.uniqueId}
      ListEmptyComponent={<ListEmptyComponent />}
      ListFooterComponent={<ListFooterComponent />}
      itemLayoutAnimation={LinearTransition}
    />
  );

  function renderItem(item: FormStateNode): ReactElement | null {
    const children = renderChild(item);
    return isValidElement(children) ? children : null;
  }

  function ListEmptyComponent() {
    return (
      <View className={"h-full items-center justify-center"}>
        {loadingControl.value ? (
          <ActivityIndicator size={"large"} color={refreshControlTintColor} />
        ) : (
          <Text className={"headline"}>No results found</Text>
        )}
      </View>
    );
  }

  function ListFooterComponent() {
    return elements.length > 0 ? (
      <View className={"flex flex-row items-center justify-center py-[16px]"}>
        {hasMoreControl.value ? (
          loadingControl.value && <ActivityIndicator size={"large"} />
        ) : (
          <Text className={"subhead"}>You’ve reached the end of the list.</Text>
        )}
      </View>
    ) : undefined;
  }
}
