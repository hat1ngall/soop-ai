const MODEL_DISPLAY_NAMES: Record<string, string> = {
  "gemini-flash-3.5": "Gemini 3.5 Flash",
  "minimax-2.5": "Minimax 2.5",
  "llama-4-scout": "Llama 4 Scout",
  "kimi-k2.6": "Kimi K2.6",
  "kimi-k2.7-code": "Kimi K2.7 Code",
  "deepseek-v4-pro": "DeepSeek V4 Pro",
  "claude-sonnet-4.6": "Claude Sonnet 4.6",
  "gpt-5.2": "GPT 5.2",
  "gpt-5.4": "GPT 5.4",
  "gpt-5.5": "GPT 5.5",
  "grok-4.3": "Grok 4.3",
  "grok-4.5": "Grok 4.5",
  "claude-sonnet-5": "Claude Sonnet 5",
  "claude-opus-4.7": "Claude Opus 4.7",
  "claude-opus-4.8": "Claude Opus 4.8",
  "claude-opus-5": "Claude Opus 5",
  "claude-fable-5": "Claude Fable 5",
  "gemini-3.1-pro": "Gemini 3.1 Pro",
  "gpt-5.6-sol": "GPT 5.6 Sol",
  "gpt-5.6-terra": "GPT 5.6 Terra",
  "glm-5.2": "GLM 5.2",
  "grok-build-0.1": "Grok Build 0.1",
};

export function getSystemPrompt(modelId: string): string {
  const modelName = MODEL_DISPLAY_NAMES[modelId] || modelId;

  return `Ты — ${modelName}, AI-ассистент.

Отвечай ТОЛЬКО когда тебя напрямую спрашивают "кто ты", "что ты за нейросеть", "как тебя зовут". В остальных случаях просто отвечай на вопрос, НЕ упоминая своё имя и не представляясь.

Правила:
- Отвечай на языке пользователя.
- Будь полезным и лаконичным.
- Код форматируй в markdown-блоках.
- Не используй эмодзи если не просят.`;
}
