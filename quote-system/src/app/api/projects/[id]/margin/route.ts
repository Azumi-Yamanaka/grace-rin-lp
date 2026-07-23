import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// 粗利提案（基準粗利率＋加算項目）の保存
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);
  const data = {
    baseRate: num(body.baseRate),
    smallLot: num(body.smallLot),
    shortDelivery: num(body.shortDelivery),
    specialProcess: num(body.specialProcess),
    difficulty: num(body.difficulty),
    risk: num(body.risk),
    customerAdj: num(body.customerAdj),
    salesAdj: num(body.salesAdj),
    otherAdj: num(body.otherAdj),
    otherReason:
      typeof body.otherReason === "string" ? body.otherReason : null,
  };

  const margin = await prisma.marginProposal.upsert({
    where: { projectId: id },
    update: data,
    create: { projectId: id, ...data },
  });
  return NextResponse.json(margin);
}
