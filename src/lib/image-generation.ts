import { lookup } from "node:dns/promises";
import { request } from "node:https";
import { isIP } from "node:net";

export const IMAGE_SIZES = ["1024x1024", "1536x1024", "1024x1536"] as const;
export type ImageSize = (typeof IMAGE_SIZES)[number];
const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
const MAX_RESPONSE_BYTES = Math.ceil(MAX_IMAGE_BYTES * 4 / 3) + 256 * 1024;

export class ImageGenerationError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = "ImageGenerationError";
  }
}

export async function readLimitedBody(body: ReadableStream<Uint8Array> | null, limit: number): Promise<Buffer> {
  if (!body) throw new ImageGenerationError(502, "Сервис вернул пустой ответ. Попробуйте ещё раз.");
  const reader = body.getReader();
  const chunks: Buffer[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > limit) {
        await reader.cancel();
        throw new ImageGenerationError(502, "Не удалось обработать изображение. Попробуйте ещё раз.");
      }
      chunks.push(Buffer.from(value));
    }
    return Buffer.concat(chunks, length);
  } finally {
    reader.releaseLock();
  }
}

function getEndpoint(): string {
  const configured = process.env.MY_CUSTOM_API_URL?.trim() || "https://api.a6api.com/v1";
  try {
    const endpoint = new URL(configured);
    if (endpoint.protocol !== "https:" || endpoint.username || endpoint.password) throw new Error();
    endpoint.pathname = endpoint.pathname.replace(/\/+$/, "").replace(/\/(?:chat\/completions|images\/generations)$/, "") + "/images/generations";
    endpoint.search = "";
    endpoint.hash = "";
    return endpoint.toString();
  } catch {
    throw new ImageGenerationError(503, "Создание изображений временно недоступно. Попробуйте позже.");
  }
}

// Downloads are pinned to a checked public address so a temporary image URL
// cannot access internal services or change its DNS answer between checks.
function isPublicAddress(address: string): boolean {
  if (isIP(address) === 4) {
    const [a, b, c] = address.split(".").map(Number);
    return !(a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) ||
      (a === 192 && b === 0) || (a === 192 && b === 2) ||
      (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) ||
      (a === 203 && b === 0 && c === 113));
  }
  if (isIP(address) === 6) {
    const [firstPart, secondPart] = address.split(":");
    const first = Number.parseInt(firstPart, 16);
    const second = Number.parseInt(secondPart || "0", 16);
    // Only ordinary global unicast; excludes mapped IPv4, local, link-local,
    // multicast, transition networks and documentation ranges.
    return first >= 0x2000 && first < 0x3fff && first !== 0x2002 &&
      !(first === 0x2001 && (second < 0x200 || second === 0xdb8));
  }
  return false;
}

async function downloadImage(rawUrl: string, signal: AbortSignal, redirects = 0): Promise<Buffer> {
  if (redirects > 3) throw new Error("Invalid image redirect");
  const url = new URL(rawUrl);
  if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443")) {
    throw new Error("Invalid image URL");
  }
  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  const addresses = isIP(hostname)
    ? [{ address: hostname, family: isIP(hostname) }]
    : await lookup(hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(({ address }) => !isPublicAddress(address))) {
    throw new Error("Invalid image host");
  }
  const target = addresses[0];
  const result = await new Promise<Buffer | string>((resolve, reject) => {
    const download = request({
      protocol: "https:", hostname: target.address, family: target.family,
      port: 443, servername: hostname, method: "GET",
      path: `${url.pathname}${url.search}`, headers: { Host: url.host, Accept: "image/png,image/jpeg,image/webp" },
      signal,
    }, (response) => {
      if (response.statusCode && [301, 302, 303, 307, 308].includes(response.statusCode)) {
        const location = response.headers.location;
        response.destroy();
        if (location) resolve(new URL(location, url).toString());
        else reject(new Error("Invalid image redirect"));
        return;
      }
      const length = Number(response.headers["content-length"] || 0);
      if (response.statusCode !== 200 || length > MAX_IMAGE_BYTES) {
        response.destroy();
        reject(new Error("Invalid image response"));
        return;
      }
      const chunks: Buffer[] = [];
      let bytes = 0;
      response.on("data", (chunk: Buffer) => {
        bytes += chunk.length;
        if (bytes > MAX_IMAGE_BYTES) {
          response.destroy(new Error("Image too large"));
          return;
        }
        chunks.push(chunk);
      });
      response.on("end", () => resolve(Buffer.concat(chunks, bytes)));
      response.on("error", reject);
      response.on("aborted", () => reject(new Error("Image download interrupted")));
    });
    download.on("error", reject);
    download.end();
  });
  return typeof result === "string" ? downloadImage(result, signal, redirects + 1) : result;
}

function validateImage(data: Buffer): { data: Buffer; mimeType: string } {
  if (!data.length || data.length > MAX_IMAGE_BYTES) throw new Error("Invalid image size");
  if (data.length >= 45 && data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) &&
    data.readUInt32BE(8) === 13 && data.toString("ascii", 12, 16) === "IHDR" &&
    data.readUInt32BE(16) > 0 && data.readUInt32BE(16) <= 8192 &&
    data.readUInt32BE(20) > 0 && data.readUInt32BE(20) <= 8192 &&
    data.toString("ascii", data.length - 8, data.length - 4) === "IEND") {
    return { data, mimeType: "image/png" };
  }
  if (data.length >= 4 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff &&
    data[data.length - 2] === 0xff && data[data.length - 1] === 0xd9) {
    return { data, mimeType: "image/jpeg" };
  }
  if (data.length >= 20 && data.toString("ascii", 0, 4) === "RIFF" && data.toString("ascii", 8, 12) === "WEBP" &&
    data.readUInt32LE(4) + 8 === data.length && ["VP8 ", "VP8L", "VP8X"].includes(data.toString("ascii", 12, 16))) {
    return { data, mimeType: "image/webp" };
  }
  throw new Error("Unsupported image format");
}

export async function generateImage(prompt: string, size: ImageSize, signal: AbortSignal): Promise<{ data: Buffer; mimeType: string }> {
  const apiKey = process.env.MY_CUSTOM_API_KEY?.trim();
  if (!apiKey) throw new ImageGenerationError(503, "Создание изображений временно недоступно. Попробуйте позже.");
  const endpoint = getEndpoint();
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: "gpt-image-2", prompt, n: 1, size, quality: "medium" }),
      signal,
      redirect: "error",
      cache: "no-store",
    });
    if (!response.ok) {
      await response.body?.cancel();
      if (response.status === 400 || response.status === 422) {
        throw new ImageGenerationError(400, "Не удалось создать изображение по этому описанию. Попробуйте изменить запрос.");
      }
      if (response.status === 429) {
        throw new ImageGenerationError(503, "Сервис создания изображений занят. Попробуйте немного позже.");
      }
      throw new ImageGenerationError(502, "Не удалось создать изображение. Попробуйте ещё раз позже.");
    }
    const body = JSON.parse((await readLimitedBody(response.body, MAX_RESPONSE_BYTES)).toString("utf8"));
    const image = body?.data?.[0];
    if (typeof image?.b64_json === "string") {
      const encoded = image.b64_json.replace(/\s/g, "");
      if (!encoded || encoded.length > MAX_RESPONSE_BYTES || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded) || encoded.length % 4 === 1) {
        throw new Error("Invalid image encoding");
      }
      const decoded = Buffer.from(encoded, "base64");
      if (decoded.toString("base64").replace(/=+$/, "") !== encoded.replace(/=+$/, "")) throw new Error("Invalid image encoding");
      return validateImage(decoded);
    }
    if (typeof image?.url === "string") return validateImage(await downloadImage(image.url, signal));
    throw new Error("Missing image");
  } catch (error) {
    if (error instanceof ImageGenerationError) throw error;
    if (signal.aborted) throw new ImageGenerationError(504, "Создание изображения заняло слишком много времени. Попробуйте ещё раз.");
    throw new ImageGenerationError(502, "Не удалось создать изображение. Попробуйте ещё раз позже.");
  }
}
