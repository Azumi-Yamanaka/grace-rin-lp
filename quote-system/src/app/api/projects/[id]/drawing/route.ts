import { NextRequest, NextResponse } from "next/server";
import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/db";

// アップロード済み図面PDFを返す（ブラウザ内プレビュー用）
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project?.drawingPath)
    return NextResponse.json({ error: "図面がありません" }, { status: 404 });

  // パストラバーサル防止: DBに保存したファイル名のみ許可
  const safeName = path.basename(project.drawingPath);
  const buf = await readFile(path.join(process.cwd(), "uploads", safeName));
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${encodeURIComponent(
        project.drawingName ?? safeName
      )}"`,
    },
  });
}

// 図面PDFのアップロード / 差し替え（SPEC 仮定A10）
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project)
    return NextResponse.json({ error: "案件が見つかりません" }, { status: 404 });

  const form = await req.formData();
  const drawing = form.get("drawing");
  if (!(drawing instanceof File) || drawing.size === 0)
    return NextResponse.json({ error: "ファイルがありません" }, { status: 400 });
  if (!drawing.name.toLowerCase().endsWith(".pdf"))
    return NextResponse.json(
      { error: "図面はPDFファイルのみアップロードできます" },
      { status: 400 }
    );

  const dir = path.join(process.cwd(), "uploads");
  await mkdir(dir, { recursive: true });
  const filename = `${id}.pdf`;
  await writeFile(
    path.join(dir, filename),
    Buffer.from(await drawing.arrayBuffer())
  );

  const updated = await prisma.project.update({
    where: { id },
    data: { drawingPath: filename, drawingName: drawing.name },
  });
  return NextResponse.json(updated);
}
