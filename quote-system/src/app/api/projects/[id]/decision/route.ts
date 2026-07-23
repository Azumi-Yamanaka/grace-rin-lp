import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// 担当者の最終価格決定を保存する（経験値のデータ化）。
// AI推奨値・最終値・差分・理由・担当者・日時を必ず記録する。
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const aiRate = Number(body.aiRate);
  const aiPrice = Number(body.aiPrice);
  const finalRate = Number(body.finalRate);
  const finalPrice = Number(body.finalPrice);
  const reason = String(body.reason ?? "").trim();
  const decidedBy = String(body.decidedBy ?? "").trim();

  if (![aiRate, aiPrice, finalRate, finalPrice].every(Number.isFinite)) {
    return NextResponse.json({ error: "数値が不正です" }, { status: 400 });
  }
  if (!decidedBy) {
    return NextResponse.json({ error: "決定担当者は必須です" }, { status: 400 });
  }
  // AI推奨値から変更する場合は理由を必須とする
  if ((finalRate !== aiRate || finalPrice !== aiPrice) && !reason) {
    return NextResponse.json(
      { error: "推奨値から変更する場合は変更理由が必須です" },
      { status: 400 }
    );
  }

  const decision = await prisma.priceDecision.create({
    data: {
      projectId: id,
      aiRate,
      aiPrice,
      finalRate,
      finalPrice,
      rateDiff: Math.round((finalRate - aiRate) * 10) / 10,
      priceDiff: finalPrice - aiPrice,
      reason: reason || "推奨値のまま採用",
      decidedBy,
    },
  });

  await prisma.project.update({
    where: { id },
    data: { status: "承認待ち" },
  });

  return NextResponse.json(decision, { status: 201 });
}
