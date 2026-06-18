const blockArtCopyPayloadPrefix = "openclaw:block-art-code:";

export function encodeBlockArtCodeBlockCopyPayload(value: string): string {
  return `${blockArtCopyPayloadPrefix}${JSON.stringify(value)}`;
}

export function decodeCodeBlockCopyPayload(value: string): string {
  if (!value.startsWith(blockArtCopyPayloadPrefix)) {
    return value;
  }
  try {
    const decoded = JSON.parse(value.slice(blockArtCopyPayloadPrefix.length));
    return typeof decoded === "string" ? decoded : value;
  } catch {
    return value;
  }
}
