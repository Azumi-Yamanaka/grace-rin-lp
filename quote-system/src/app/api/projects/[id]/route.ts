import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { STATUSES } from "@/lib/status";

// 案件詳細（関連データすべて）
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      analysis: true,
      costItems: { orderBy: { sortOrder: "asc" } },
      costLogs: { orderBy: { createdAt: "desc" } },
      margin: true,
      decisions: { orderBy: { decidedAt: "desc" } },
      order: true,
    },
  });
  if (!project)
    return NextResponse.json({ error: "案件が見つかりません" }, { status: 404 });
  return NextResponse.json(project);
}

// 案件情報・ステータス更新
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const data: Record<string, unknown> = {};
  if (typeof body.status === "string") {
    if (!STATUSES.includes(body.status)) {
      return NextResponse.json({ error: "不正なステータスです" }, { status: 400 });
    }
    data.status = body.status;
  }
  for (const key of ["name", "customerName", "assignee", "notes"] as const) {
    if (typeof body[key] === "string") data[key] = body[key];
  }
  if (body.quantity !== undefined) data.quantity = Number(body.quantity) || 1;
  if (body.dueDate !== undefined)
    data.dueDate = body.dueDate ? new Date(body.dueDate) : null;

  const project = await prisma.project.update({ where: { id }, data });
  return NextResponse.json(project);
}

// 案件削除
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.project.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
