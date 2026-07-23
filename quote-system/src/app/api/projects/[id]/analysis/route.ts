import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// 図面解析結果の人間による修正を保存する（AI生出力 aiResultJson は変更しない）
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { data, confirmedBy } = body as {
    data: Record<string, unknown>;
    confirmedBy?: string;
  };
  if (!data)
    return NextResponse.json({ error: "data は必須です" }, { status: 400 });

  const existing = await prisma.drawingAnalysis.findUnique({
    where: { projectId: id },
  });
  if (!existing)
    return NextResponse.json(
      { error: "先にAI解析を実行してください" },
      { status: 400 }
    );

  const analysis = await prisma.drawingAnalysis.update({
    where: { projectId: id },
    data: {
      editedJson: JSON.stringify(data),
      status: "確認済",
      confirmedBy: confirmedBy || null,
      confirmedAt: new Date(),
    },
  });
  return NextResponse.json(analysis);
}
