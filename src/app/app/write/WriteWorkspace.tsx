"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FileUpload } from "@/components/FileUpload";
import { parseFile } from "@/lib/file-parser";

type ChatRole = "user" | "assistant";
type ChatMessage = { role: ChatRole; content: string };
type ChatBubble = ChatMessage & { id: string; attachments?: string[]; isStreaming?: boolean };
type Attachment = { name: string; content: string };

function createId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function trimHistory(messages: ChatMessage[]) {
  if (messages.length <= 16) {
    return messages;
  }
  return [messages[0], ...messages.slice(-12)];
}

function readStreamChunk(chunk: string) {
  return chunk.replace(/\r/g, "");
}

async function readJsonSafe(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function getLatestAssistantMessage(messages: ChatBubble[]) {
  return [...messages].reverse().find((item) => item.role === "assistant" && item.content.trim());
}

function AssistantMessageActions({
  canSave,
  onCopy,
  onSave,
  copied,
  saving,
}: {
  canSave: boolean;
  onCopy: () => void;
  onSave: () => void;
  copied: boolean;
  saving: boolean;
}) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <button
        type="button"
        onClick={onCopy}
        className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-400"
      >
        {copied ? "已复制 ✓" : "复制"}
      </button>
      {canSave ? (
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-400 disabled:opacity-60"
        >
          {saving ? "保存中..." : "保存到历史"}
        </button>
      ) : null}
    </div>
  );
}

function MessageBubble({
  message,
  isLatestAssistant,
  onCopy,
  onSave,
  copied,
  saving,
  canSave,
}: {
  message: ChatBubble;
  isLatestAssistant: boolean;
  onCopy: () => void;
  onSave: () => void;
  copied: boolean;
  saving: boolean;
  canSave: boolean;
}) {
  const isUser = message.role === "user";
  const firstLine = message.content.split(/\r?\n/)[0] ?? "";
  const rest = message.content.slice(firstLine.length).trimStart();

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={[
          "max-w-[92%] rounded-[28px] px-5 py-4 shadow-sm sm:max-w-[85%]",
          isUser ? "bg-slate-100 text-slate-900" : "border border-slate-200 bg-white text-slate-800",
        ].join(" ")}
      >
        {message.attachments?.length ? (
          <div className="mb-3 flex flex-wrap gap-2">
            {message.attachments.map((item) => (
              <span key={`${message.id}-${item}`} className="rounded-full bg-white/70 px-3 py-1 text-xs text-slate-600 ring-1 ring-slate-200">
                附件：{item}
              </span>
            ))}
          </div>
        ) : null}
        {isUser ? (
          <p className="whitespace-pre-wrap break-words text-sm leading-7">{message.content}</p>
        ) : (
          <div>
            {firstLine ? <p className="whitespace-pre-wrap break-words text-[15px] font-semibold leading-7">{firstLine}</p> : null}
            {rest ? <p className="mt-2 whitespace-pre-wrap break-words text-[15px] leading-8">{rest}</p> : null}
            {message.isStreaming ? <p className="mt-3 text-xs text-slate-400">AI 正在生成...</p> : null}
            {!message.isStreaming ? (
              <AssistantMessageActions
                canSave={isLatestAssistant && canSave}
                onCopy={onCopy}
                onSave={onSave}
                copied={copied}
                saving={saving}
              />
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

export function WriteWorkspace() {
  const [messages, setMessages] = useState<ChatBubble[]>([]);
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState("");
  const [savedLatest, setSavedLatest] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const latestAssistant = useMemo(() => getLatestAssistantMessage(messages), [messages]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function handleFilesSelect(files: FileList) {
    setError("");
    try {
      const nextAttachments: Attachment[] = [];
      for (const file of Array.from(files)) {
        const content = await parseFile(file);
        nextAttachments.push({ name: file.name, content });
      }
      setAttachments((current) => [...current, ...nextAttachments]);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "附件解析失败，请重试。");
    }
  }

  function handleRemoveFile(fileName: string) {
    setAttachments((current) => current.filter((item) => item.name !== fileName));
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text && !attachments.length) {
      setError("请输入内容或上传附件。");
      return;
    }

    const attachmentNames = attachments.map((item) => item.name);
  const attachmentText = attachments.map((item) => `【附件：${item.name}】\n${item.content}`).join("\n\n");
    const content = [text, attachmentText].filter(Boolean).join("\n\n");
    const userMessage: ChatBubble = { id: createId(), role: "user", content, attachments: attachmentNames };
    const assistantId = createId();
    const nextMessages = [...messages, userMessage];

    setMessages([...nextMessages, { id: assistantId, role: "assistant", content: "", isStreaming: true }]);
    setInput("");
    setAttachments([]);
    setError("");
    setIsStreaming(true);
    setSavedLatest(false);

    const controller = new AbortController();
    controllerRef.current = controller;

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          materialType: "propaganda",
          messages: trimHistory(nextMessages).map(({ role, content: messageContent }) => ({ role, content: messageContent })),
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const result = await readJsonSafe(response);
        throw new Error(result?.error || "生成失败，请重试。");
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("生成流不可用，请稍后重试。");
      }

      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          for (const line of part.split("\n")) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;
            const data = trimmed.slice(5).trim();
            if (!data || data === "[DONE]") continue;
            const chunk = readStreamChunk(data);
            fullText += chunk;
            setMessages((current) =>
              current.map((item) => (item.id === assistantId ? { ...item, content: fullText, isStreaming: true } : item)),
            );
          }
        }
      }

      setMessages((current) =>
        current.map((item) => (item.id === assistantId ? { ...item, content: fullText.trim(), isStreaming: false } : item)),
      );
    } catch (sendError) {
      if (sendError instanceof DOMException && sendError.name === "AbortError") {
        setMessages((current) => current.map((item) => (item.id === assistantId ? { ...item, isStreaming: false } : item)));
      } else {
        setError(sendError instanceof Error ? sendError.message : "生成失败，请重试。");
        setMessages((current) => current.filter((item) => item.id !== assistantId));
      }
    } finally {
      setIsStreaming(false);
      controllerRef.current = null;
    }
  }

  function handleStop() {
    controllerRef.current?.abort();
    setIsStreaming(false);
  }

  async function handleSaveHistory() {
    if (!latestAssistant?.content.trim()) {
      return;
    }

    setIsSaving(true);
    setError("");
    try {
      const response = await fetch("/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: messages.map(({ role, content }) => ({ role, content })),
          finalOutput: latestAssistant.content,
          materialType: "propaganda",
        }),
      });
      const result = await readJsonSafe(response);
      if (!response.ok) {
        throw new Error(result?.error || "保存历史失败，请重试。");
      }
      setSavedLatest(true);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "保存历史失败，请重试。");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCopy(message: ChatBubble) {
    if (!message.content.trim()) return;
    await navigator.clipboard.writeText(message.content);
    setCopiedId(message.id);
    window.setTimeout(() => setCopiedId(""), 2000);
  }

  function handleNewChat() {
    if (messages.length && !savedLatest) {
      const confirmed = window.confirm("当前对话尚未保存，确定开始新对话吗？");
      if (!confirmed) return;
    }
    controllerRef.current?.abort();
    setMessages([]);
    setInput("");
    setAttachments([]);
    setError("");
    setIsStreaming(false);
    setSavedLatest(false);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.ctrlKey && event.key === "Enter") {
      event.preventDefault();
      if (isStreaming) {
        handleStop();
      } else {
        void sendMessage();
      }
    }
  }

  return (
    <section className="mx-auto flex min-h-[calc(100vh-140px)] max-w-4xl flex-col px-2 pb-28">
      <div className="mb-4 flex items-center justify-between gap-3 rounded-[28px] border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <div>
          <p className="text-sm font-medium text-slate-500">对话式写作</p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900 sm:text-3xl">宣传稿写作台</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleSaveHistory}
            disabled={!latestAssistant?.content.trim() || isSaving}
            className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 disabled:opacity-50"
          >
            {isSaving ? "保存中..." : savedLatest ? "已保存" : "保存到历史"}
          </button>
          <button
            type="button"
            onClick={handleNewChat}
            className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400"
          >
            新对话
          </button>
        </div>
      </div>

      <div ref={listRef} className="flex-1 space-y-4 overflow-y-auto rounded-[32px] border border-slate-200 bg-slate-50 p-4 shadow-sm sm:p-6">
        {messages.length ? (
          messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              isLatestAssistant={latestAssistant?.id === message.id}
              onCopy={() => void handleCopy(message)}
              onSave={() => void handleSaveHistory()}
              copied={copiedId === message.id}
              saving={isSaving}
              canSave={!savedLatest}
            />
          ))
        ) : (
          <div className="flex h-full min-h-[420px] items-center justify-center text-center text-sm leading-7 text-slate-400">
            <div>
              <p className="text-base font-medium text-slate-600">把你想写的内容随便说说，AI 会直接起草整篇宣传稿。</p>
              <p className="mt-2">如果不满意，就继续输入修改意见，比如“标题短一点”“第二段加点数据”“更像简报口吻”。</p>
            </div>
          </div>
        )}
      </div>

      <div className="fixed bottom-4 left-1/2 z-20 w-full max-w-4xl -translate-x-1/2 px-4">
        <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-xl">
          {attachments.length ? (
            <div className="mb-3 flex flex-wrap gap-2">
              {attachments.map((item) => (
                <span key={item.name} className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
                  附件：{item.name}
                  <button type="button" onClick={() => handleRemoveFile(item.name)} className="text-slate-400 hover:text-slate-700">
                    x
                  </button>
                </span>
              ))}
            </div>
          ) : null}
          {error ? <div className="mb-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
          <div className="flex items-end gap-3">
            <div className="shrink-0">
              <FileUpload
                isLoading={isStreaming}
                fileNames={attachments.map((item) => item.name)}
                onSelect={handleFilesSelect}
                onRemove={handleRemoveFile}
              />
            </div>
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              rows={3}
              placeholder="把你想写的内容随便说说，或者告诉我怎么修改..."
              className="min-h-[84px] flex-1 resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-7 text-slate-800 outline-none transition focus:border-slate-400"
            />
            <button
              type="button"
              onClick={isStreaming ? handleStop : () => void sendMessage()}
              className={[
                "shrink-0 rounded-full px-5 py-3 text-sm font-medium text-white transition",
                isStreaming ? "bg-rose-500 hover:bg-rose-600" : "bg-slate-900 hover:bg-slate-800",
              ].join(" ")}
            >
              {isStreaming ? "停止" : "发送"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
