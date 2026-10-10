export interface ChatAttachment {
  name: string;
  type: string;
  dataUrl?: string;
  text?: string;
  size?: number;
}

export async function processFile(file: File): Promise<ChatAttachment | null> {
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
