export function getViewAndParams(tabId: string): [string, string?] {
  return tabId.split(":", 2) as [string, string?];
}
