export function isJunkEntry(entryName: string): boolean {
  return entryName === "__MACOSX" || entryName === ".DS_Store" || entryName.startsWith("._");
}
