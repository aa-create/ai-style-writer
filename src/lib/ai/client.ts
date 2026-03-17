import "server-only";

export type AIMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type CallAIOptions = {
  stream?: boolean;
  temperature?: number;
};

type CallAIResponse<T extends boolean | undefined> = T extends true
  ? ReadableStream<Uint8Array>
  : string;

function getAIEnv() {
  const baseUrl = process.env.AI_BASE_URL;
  const apiKey = process.env.AI_API_KEY;
  const model = process.env.AI_MODEL;

  if (!baseUrl || !apiKey || !model) {
    throw new Error("缺少 AI 环境变量，请检查 .env.local 配置。");
  }

  return { baseUrl, apiKey, model };
}

async function readTextResponse(response: Response) {
  const result = await response.json();
  return result.choices?.[0]?.message?.content?.trim() ?? "";
}

export async function callAI<T extends boolean | undefined = false>(
  messages: AIMessage[],
  options?: CallAIOptions & { stream?: T },
): Promise<CallAIResponse<T>> {
  const { baseUrl, apiKey, model } = getAIEnv();

  const response = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      stream: options?.stream ?? false,
      temperature: options?.temperature ?? 0.7,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AI 调用失败：${response.status} ${errorText}`);
  }

  if (options?.stream) {
    if (!response.body) {
      throw new Error("AI 流式响应为空。");
    }

    return response.body as CallAIResponse<T>;
  }

  const content = await readTextResponse(response);
  return content as CallAIResponse<T>;
}
