import { ControlDefinition } from "@react-typed-forms/schemas";

interface ClipboardData {
  controls?: ControlDefinition[];
}
export async function isControlOnClipboard(): Promise<boolean> {
  const clipData = await getClipboardData();
  return isClipDataControls(clipData);
}

export async function getClipboardControls(): Promise<
  ControlDefinition[] | undefined
> {
  const clipData = await getClipboardData();
  return isClipDataControls(clipData) ? clipData.controls : undefined;
}
function isClipDataControls(
  c: ClipboardData | undefined,
): c is { controls: ControlDefinition[] } {
  return c ? Array.isArray(c.controls) : false;
}

async function getClipboardData(): Promise<ClipboardData | undefined> {
  const copyText = await navigator.clipboard.readText();
  try {
    return JSON.parse(copyText) as ClipboardData;
  } catch (e) {
    return undefined;
  }
}

export async function writeClipboardData(data: ClipboardData) {
  await navigator.clipboard.writeText(JSON.stringify(data));
}
