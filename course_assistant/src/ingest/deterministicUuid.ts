import { createHash } from "node:crypto";

export function deterministicUuidFromString(input: string): string {
  const hashHex = createHash("md5").update(input).digest("hex");
  return [
    hashHex.slice(0, 8),
    hashHex.slice(8, 12),
    "4" + hashHex.slice(13, 16),
    ((parseInt(hashHex[16], 16) & 0x3) | 0x8).toString(16) + hashHex.slice(17, 20),
    hashHex.slice(20, 32),
  ].join("-");
}
