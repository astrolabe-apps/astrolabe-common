import { BoxBase, LayoutBase, PanelBase, TabBase } from "rc-dock/es";

export type AnyBase = PanelBase | TabBase | BoxBase | undefined;
function findInPanel(
  panel: PanelBase,
  id: string,
  filter: Filter,
): PanelBase | TabBase | undefined {
  if (panel.id === id && filter & Filter.Panel) {
    return panel;
  }
  if (filter & Filter.Tab) {
    for (let tab of panel.tabs) {
      if (tab.id === id) {
        return tab;
      }
    }
  }
  return undefined;
}

function findInBox(
  box: BoxBase | undefined,
  id: string,
  filter: Filter,
): AnyBase {
  let result: AnyBase;
  if (filter | Filter.Box && box?.id === id) {
    return box;
  }
  if (!box?.children) {
    return undefined;
  }
  for (let child of box.children) {
    if ("children" in child) {
      if ((result = findInBox(child, id, filter))) {
        break;
      }
    } else if ("tabs" in child) {
      if ((result = findInPanel(child, id, filter))) {
        break;
      }
    }
  }
  return result;
}

export enum Filter {
  Tab = 1,
  Panel = 1 << 1,
  Box = 1 << 2,
  Docked = 1 << 3,
  Floated = 1 << 4,
  Windowed = 1 << 5,
  Max = 1 << 6,
  EveryWhere = Docked | Floated | Windowed | Max,
  AnyTab = Tab | EveryWhere,
  AnyPanel = Panel | EveryWhere,
  AnyTabPanel = Tab | Panel | EveryWhere,
  All = Tab | Panel | Box | EveryWhere,
}

export function find(
  layout: LayoutBase,
  id: string,
  filter: Filter = Filter.AnyTabPanel,
): AnyBase {
  let result: AnyBase;

  if (filter & Filter.Docked) {
    result = findInBox(layout.dockbox, id, filter);
  }
  if (result) return result;

  if (filter & Filter.Floated) {
    result = findInBox(layout.floatbox, id, filter);
  }
  if (result) return result;

  if (filter & Filter.Windowed) {
    result = findInBox(layout.windowbox, id, filter);
  }
  if (result) return result;

  if (filter & Filter.Max) {
    result = findInBox(layout.maxbox, id, filter);
  }

  return result;
}
