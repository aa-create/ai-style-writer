const MAX_FILE_SIZE = 5 * 1024 * 1024;

function assertFileSize(file: File) {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error("文件大小不能超过 5MB。");
  }
}

function getExtension(fileName: string) {
  const parts = fileName.toLowerCase().split(".");
  return parts.length > 1 ? parts.pop() ?? "" : "";
}

async function parseDocx(file: File) {
  const mammoth = await import("mammoth/mammoth.browser");
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value.trim();
}

async function parsePdf(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/parse-pdf", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "PDF 解析失败，请稍后重试。");
  }

  const result = (await response.json()) as { text?: string };
  return result.text?.trim() ?? "";
}

export async function parseFile(file: File): Promise<string> {
  assertFileSize(file);

  const extension = getExtension(file.name);

  try {
    if (extension === "txt" || extension === "md") {
      return (await file.text()).trim();
    }

    if (extension === "docx") {
      return await parseDocx(file);
    }

    if (extension === "pdf") {
      return await parsePdf(file);
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "文件解析失败，请稍后重试。";

    throw new Error(message);
  }

  throw new Error("仅支持 txt、md、docx、pdf 格式文件。");
}
