export function cc(n: string | null | undefined, fallback?: string): string | undefined {
  return n ? n : fallback;
}
