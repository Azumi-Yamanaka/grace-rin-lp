import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/db";
import { generateProjectId } from "@/lib/project-id";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

// 案件一覧（?status= でフィルタ）
export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get("status");
  const projects = await prisma.project.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: "desc" },
    include: {
      decisions: { orderBy: { decidedAt: "desc" }, take: 1 },
      costItems: { select: { amount: true } },
    },
  });
  return NextResponse.json(projects);
}

// 案件登録（multipart/form-data: 図面PDF付き）
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const name = String(form.get("name") ?? "").trim();
  const customerName = String(form.get("customerName") ?? "").trim();
  const assignee = String(form.get("assignee") ?? "").trim();
  const quantity = parseInt(String(form.get("quantity") ?? "1"), 10) || 1;
  const dueDate = String(form.get("dueDate") ?? "");
  const notes = String(form.get("notes") ?? "");
  const drawing = form.get("drawing");

  if (!name || !customerName || !assignee) {
    return NextResponse.json(
      { error: "案件名・顧客名・担当者は必須です" },
      { status: 400 }
    );
  }

  const id = await generateProjectId();

  let drawingPath: string | null = null;
  let drawingName: string | null = null;
  if (drawing instanceof File && drawing.size > 0) {
    if (!drawing.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json(
        { error: "図面はPDFファイルのみアップロードできます" },
        { status: 400 }
      );
    }
    await mkdir(UPLOAD_DIR, { recursive: true });
    const filename = `${id}.pdf`;
    await writeFile(
      path.join(UPLOAD_DIR, filename),
      Buffer.from(await drawing.arrayBuffer())
    );
    drawingPath = filename;
    drawingName = drawing.name;
  }

  const project = await prisma.project.create({
    data: {
      id,
      name,
      customerName,
      assignee,
      quantity,
      dueDate: dueDate ? new Date(dueDate) : null,
      notes: notes || null,
      drawingPath,
      drawingName,
    },
  });

  return NextResponse.json(project, { status: 201 });
}
