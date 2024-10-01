import {
  ControlLayoutProps,
  DefaultGroupRendererOptions,
  FlexRenderer,
  GridRenderer,
  GroupRendererProps,
  GroupRendererRegistration,
  isFlexRenderer,
  isGridRenderer,
  rendererClass,
} from '@react-typed-forms/schemas';
import clsx from 'clsx';
import { StyleProp, View, ViewStyle } from 'react-native';

export function createDefaultGroupRenderer(
  options?: DefaultGroupRendererOptions
): GroupRendererRegistration {
  const {
    className,
    gridStyles = defaultGridStyles,
    defaultGridColumns = 2,
    gridClassName,
    standardClassName,
    flexClassName,
    defaultFlexGap,
  } = options ?? {};

  function defaultGridStyles({ columns = defaultGridColumns }: GridRenderer) {
    return {
      className: gridClassName,
      style: {
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
      },
    };
  }

  function flexStyles(options: FlexRenderer) {
    return {
      className: flexClassName,
      style: {
        display: 'flex',
        gap: options.gap ? options.gap : defaultFlexGap,
        flexDirection: options.direction ? (options.direction as any) : undefined,
      },
    };
  }

  function render(props: GroupRendererProps) {
    const { renderChild, renderOptions, childDefinitions } = props;

    const { style, className: gcn } = isGridRenderer(renderOptions)
      ? gridStyles(renderOptions)
      : isFlexRenderer(renderOptions)
        ? flexStyles(renderOptions)
        : { className: standardClassName };

    return (cp: ControlLayoutProps) => {
      return {
        ...cp,
        children: (
          <View
            className={rendererClass(props.className, clsx(className, gcn))}
            style={style as StyleProp<ViewStyle>}>
            {childDefinitions?.map((c, i) => renderChild(i, c))}
          </View>
        ),
      };
    };
  }

  return { type: 'group', render };
}
