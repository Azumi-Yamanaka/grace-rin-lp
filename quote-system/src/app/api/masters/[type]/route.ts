import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// マスタ種別と Prisma モデルの対応
const delegates = {
  materials: () => prisma.materialMaster,
  processes: () => prisma.processMaster,
  outsource: () => prisma.outsourceMaster,
  purchased: () => prisma.purchasedPartMaster,
} as const;

type MasterType = keyof typeof delegates;

function getDelegate(type: string) {
  if (!(type in delegates)) return null;
  return delegates[type as MasterType]();
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  const { type } = await params;
  const delegate = getDelegate(type);
  if (!delegate)
    return NextResponse.json({ error: "不明なマスタ種別です" }, { status: 404 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = await (delegate as any).findMany({ orderBy: { id: "asc" } });
  return NextResponse.json(rows);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  const { type } = await params;
  const delegate = getDelegate(type);
  if (!delegate)
    return NextResponse.json({ error: "不明なマスタ種別です" }, { status: 404 });
  const body = await req.json();
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row = await (delegate as any).create({ data: body });
    return NextResponse.json(row, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "登録に失敗しました（コード重複・必須項目不足の可能性）" },
      { status: 400 }
    );
  }
}
