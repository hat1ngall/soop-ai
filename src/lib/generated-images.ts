export const IMAGE_SIZES = [
  { value: "1024x1024", label: "Квадрат", ratio: "1:1" },
  { value: "1536x1024", label: "Альбом", ratio: "3:2" },
  { value: "1024x1536", label: "Портрет", ratio: "2:3" },
] as const;

export type ImageSize = (typeof IMAGE_SIZES)[number]["value"];

export interface GeneratedImageContent {
  type: "generated_image";
  imageId: string;
  prompt: string;
  size: ImageSize;
}

export function parseGeneratedImage(content: string): GeneratedImageContent | null {
  if (!content.startsWith('{"type":"generated_image"')) return null;
  try {
    const value = JSON.parse(content);
    if (
      value.type !== "generated_image" ||
      typeof value.imageId !== "string" ||
      !/^[a-zA-Z0-9_-]{8,80}$/.test(value.imageId) ||
      typeof value.prompt !== "string" ||
      !IMAGE_SIZES.some((size) => size.value === value.size)
    ) return null;
    return value;
  } catch {
    return null;
  }
}
