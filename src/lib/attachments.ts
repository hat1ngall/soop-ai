import { Unzip, UnzipInflate } from "fflate";

export interface ChatAttachment {
  name: string;
  type: string;
  dataUrl?: string;
  text?: string;
  size?: number;
}

export async function processFile(file: File): Promise<ChatAttachment | null> {
  if (/\.zip$/i.test(file.name) || file.type === "application/zip" || file.type === "application/x-zip-compressed") {
    return processZip(file);
  }
  // Изображения: пережимаем и кодируем в base64 dataUrl
  if (file.type.startsWith("image/")) {
    const dataUrl = await resizeAndEncodeImage(file);
    return {
      name: file.name,
      type: file.type || "image/jpeg",
      dataUrl,
      size: file.size,
    };
  }

  // Текстовые файлы и код
  try {
    const rawText = await file.text();
    // Ограничение до 50 000 символов на файл для защиты контекста
    const maxChars = 50_000;
    const text =
      rawText.length > maxChars
        ? rawText.slice(0, maxChars) + "\n\n...[Файл обрезан, показаны первые 50 000 символов]..."
        : rawText;
    return {
      name: file.name,
      type: file.type || "text/plain",
      text,
      size: file.size,
    };
  } catch {
    return null;
  }
}

async function processZip(file: File): Promise<ChatAttachment> {
  const archive = new Uint8Array(await file.arrayBuffer());
  if (archive.length < 4 || archive[0] !== 0x50 || archive[1] !== 0x4b || ![3, 5, 7].includes(archive[2])) {
    throw new Error("Не удалось прочитать ZIP-архив. Проверьте, что файл не повреждён.");
  }
  const maxFiles = 100;
  const maxBytes = 1_000_000;
  const maxChars = 50_000;
  const textExtensions = /\.(txt|md|markdown|json|csv|tsv|js|jsx|ts|tsx|mjs|cjs|py|html|htm|css|scss|sql|xml|yaml|yml|log|java|c|h|cpp|hpp|cs|go|rs|rb|php|sh|ps1|toml|ini|cfg|conf|properties|env|svg)$/i;
  const chunks: string[] = [];
  let files = 0;
  let bytes = 0;
  let skipped = 0;
  const unzip = new Unzip((entry) => {
    if (entry.name.endsWith("/")) return;
    if (++files > maxFiles) throw new Error("В ZIP-архиве больше 100 файлов. Уменьшите архив.");
    const baseName = entry.name.split("/").pop() || "";
    if ((!textExtensions.test(baseName) && !/^(readme|license|dockerfile|makefile|\.env)$/i.test(baseName)) || (entry.originalSize !== undefined && entry.originalSize > maxBytes)) {
      skipped++;
      return;
    }
    if (entry.compression !== 0 && entry.compression !== 8) { skipped++; return; }
    const decoder = new TextDecoder("utf-8", { fatal: true });
    let text = "";
    entry.ondata = (error, data, final) => {
      if (error) throw error;
      bytes += data.length;
      if (bytes > maxBytes) throw new Error("Текст в ZIP-архиве слишком большой. Уменьшите архив.");
      try { text += decoder.decode(data, { stream: !final }); }
      catch { throw new Error(`Не удалось прочитать текст в ${entry.name}. Сохраните файл в UTF-8.`); }
      if (final) chunks.push(`--- ${entry.name.replace(/[\r\n]/g, " ")} ---\n${text}`);
    };
    entry.start();
  });
  unzip.register(UnzipInflate);
  try {
    for (let offset = 0; offset < archive.length; offset += 16_384) {
      unzip.push(archive.subarray(offset, offset + 16_384), offset + 16_384 >= archive.length);
    }
  } catch (error) {
    if (error instanceof Error && /ZIP-архив|UTF-8/.test(error.message)) throw error;
    throw new Error("Не удалось прочитать ZIP-архив. Возможно, он повреждён или защищён паролем.");
  }
  if (!chunks.length) throw new Error("В ZIP-архиве не найдено доступных текстовых файлов или кода.");
  let text = chunks.join("\n\n");
  if (text.length > maxChars) text = text.slice(0, maxChars) + "\n\n...[Содержимое архива обрезано до 50 000 символов]...";
  if (skipped) text += `\n\n[Пропущено файлов: ${skipped}; поддерживаются текстовые файлы и код.]`;
  return { name: file.name, type: "application/zip", text, size: file.size };
}

function resizeAndEncodeImage(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target?.result as string;
      if (!src) {
        resolve("");
        return;
      }

      const img = new Image();
      img.onload = () => {
        const maxDim = 1600;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(src);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const mime = file.type === "image/png" ? "image/png" : "image/jpeg";
        resolve(canvas.toDataURL(mime, 0.85));
      };
      img.onerror = () => resolve(src);
      img.src = src;
    };
    reader.onerror = () => resolve("");
    reader.readAsDataURL(file);
  });
}
