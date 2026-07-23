import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const delegates = {
  materials: () => prisma.materialMaster,
  processes: () => prisma.processMaster,
  outsource: () => prisma.outsourceMaster,
  purchased: () => prisma.purchasedPartMaster,
} as const;

function getDelegate(type: string) {
  if (!(type in delegates)) return null;
  return delegates[type as keyof typeof delegates]();
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ type: string; id: string }> }
) {
  const { type, id } = await params;
  const delegate = getDelegate(type);
  if (!delegate)
    return NextResponse.json({ error: "不明なマスタ種別です" }, { status: 404 });
  const body = await req.json();
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row = await (delegate as any).update({
      where: { id: Number(id) },
      data: body,
    });
    return NextResponse.json(row);
  } catch {
    return NextResponse.json({ error: "更新に失敗しました" }, { status: 400 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ type: string; id: string }> }
) {
  const { type, id } = await params;
  const delegate = getDelegate(type);
  if (!delegate)
    return NextResponse.json({ error: "不明なマスタ種別です" }, { status: 404 });
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (delegate as any).delete({ where: { id: Number(id) } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "削除に失敗しました" }, { status: 400 });
  }
}
