import { NextResponse } from "next/server";
import { PDFParse } from "pdf-parse";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

export const runtime = "nodejs";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "PDF 解析失败，请稍后重试。";
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return new NextResponse("请上传 PDF 文件。", { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return new NextResponse("文件大小不能超过 5MB。", { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      return new NextResponse("仅支持 PDF 文件。", { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const parser = new PDFParse({ data: Buffer.from(arrayBuffer) });

    try {
      const result = await parser.getText();
      return NextResponse.json({ text: result.text?.trim() ?? "" });
    } finally {
      await parser.destroy();
    }
  } catch (error) {
    return new NextResponse(getErrorMessage(error), { status: 500 });
  }
}
