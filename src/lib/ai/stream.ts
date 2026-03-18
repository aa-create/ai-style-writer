import { NextResponse } from "next/server";
import { EventSourceParserStream } from "eventsource-parser/stream";

type AIStreamOptions = {
  onComplete?: (content: string) => Promise<void> | void;
};

function createSSEMessage(data: string) {
  return `data: ${data}\n\n`;
}

function createTextDecodeStream() {
  const decoder = new TextDecoder();

  return new TransformStream<Uint8Array, string>({
    transform(chunk, controller) {
      controller.enqueue(decoder.decode(chunk, { stream: true }));
    },
    flush(controller) {
      const tail = decoder.decode();
      if (tail) {
        controller.enqueue(tail);
      }
    },
  });
}

export function createAIStreamResponse(
  stream: ReadableStream<Uint8Array>,
  options?: AIStreamOptions,
) {
  const encoder = new TextEncoder();
  let fullText = "";
  let doneSent = false;

  const sseStream = stream
    .pipeThrough(createTextDecodeStream())
    .pipeThrough(new EventSourceParserStream())
    .pipeThrough(
      new TransformStream({
        async transform(event, controller) {
          if (event.data === "[DONE]") {
            doneSent = true;
            controller.enqueue(encoder.encode(createSSEMessage("[DONE]")));
            return;
          }

          try {
            const json = JSON.parse(event.data);
            const content = json.choices?.[0]?.delta?.content;

            if (content) {
              fullText += content;
              controller.enqueue(encoder.encode(createSSEMessage(content)));
            }
          } catch {
            controller.enqueue(encoder.encode(createSSEMessage(event.data)));
          }
        },
        async flush(controller) {
          await options?.onComplete?.(fullText);

          if (!doneSent) {
            controller.enqueue(encoder.encode(createSSEMessage("[DONE]")));
          }
        },
      }),
    );

  return new NextResponse(sseStream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
