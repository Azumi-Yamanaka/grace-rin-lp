import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

interface CostItemPayload {
  category: string;
  code?: string | null;
  name: string;
  quantity: number;
  unit?: string | null;
  unitPrice: number;
  amount: number;
  source: string;
  sortOrder: number;
}

interface AdjustmentPayload {
  itemName: string;
  field: string;
  beforeValue: string;
  afterValue: string;
  reason: string;
  editedBy: string;
}

// 原価明細の一括保存。
// 手動修正があった行は adjustments に修正前/修正後/理由を添えて送られ、履歴として保存する。
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = (await req.json()) as {
    items: CostItemPayload[];
    adjustments?: AdjustmentPayload[];
  };
  if (!Array.isArray(body.items))
    return NextResponse.json({ error: "items は必須です" }, { status: 400 });

  // 手動修正には理由を必須とする（Human-in-the-loop 要件）
  for (const adj of body.adjustments ?? []) {
    if (!adj.reason?.trim())
      return NextResponse.json(
        { error: "手動修正には修正理由が必須です" },
        { status: 400 }
      );
  }

  await prisma.$transaction([
    prisma.costItem.deleteMany({ where: { projectId: id } }),
    prisma.costItem.createMany({
      data: body.items.map((i, idx) => ({
        projectId: id,
        category: i.category,
        code: i.code ?? null,
        name: i.name,
        quantity: Number(i.quantity) || 0,
        unit: i.unit ?? null,
        unitPrice: Number(i.unitPrice) || 0,
        amount: Number(i.amount) || 0,
        source: i.source === "manual" ? "manual" : "auto",
        sortOrder: idx,
      })),
    }),
    ...(body.adjustments ?? []).map((a) =>
      prisma.costAdjustmentLog.create({
        data: {
          projectId: id,
          itemName: a.itemName,
          field: a.field,
          beforeValue: a.beforeValue,
          afterValue: a.afterValue,
          reason: a.reason,
          editedBy: a.editedBy || "不明",
        },
      })
    ),
  ]);

  const items = await prisma.costItem.findMany({
    where: { projectId: id },
    orderBy: { sortOrder: "asc" },
  });
  return NextResponse.json(items);
}
