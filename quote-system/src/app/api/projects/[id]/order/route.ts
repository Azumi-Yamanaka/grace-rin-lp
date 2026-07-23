import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// 受注 / 失注の登録
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const result = String(body.result ?? "");
  if (result !== "受注" && result !== "失注") {
    return NextResponse.json(
      { error: "result は 受注 / 失注 のいずれかです" },
      { status: 400 }
    );
  }
  const orderPrice =
    body.orderPrice !== undefined && body.orderPrice !== null && body.orderPrice !== ""
      ? Number(body.orderPrice)
      : null;

  const order = await prisma.orderResult.upsert({
    where: { projectId: id },
    update: { result, orderPrice, note: body.note ?? null, decidedAt: new Date() },
    create: { projectId: id, result, orderPrice, note: body.note ?? null },
  });

  await prisma.project.update({ where: { id }, data: { status: result } });
  return NextResponse.json(order);
}
