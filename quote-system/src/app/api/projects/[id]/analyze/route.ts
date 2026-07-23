import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/db";
import { getAIProvider } from "@/lib/ai/provider";

// 図面のAI解析を実行する。
// AI の生出力は aiResultJson に保存し、以後上書きしない（履歴要件）。
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project)
    return NextResponse.json({ error: "案件が見つかりません" }, { status: 404 });
  if (!project.drawingPath)
    return NextResponse.json(
      { error: "図面PDFがアップロードされていません" },
      { status: 400 }
    );

  await prisma.project.update({
    where: { id },
    data: { status: "図面解析中" },
  });

  try {
    const pdf = await readFile(
      path.join(process.cwd(), "uploads", project.drawingPath)
    );
    const provider = getAIProvider();
    // ログにはプロバイダ名と案件IDのみ（図面内容・APIキーは出力しない）
    console.log(`[ai] analyze start project=${id} provider=${provider.name}`);
    const result = await provider.analyzeDrawing(pdf, {
      projectName: project.name,
      quantity: project.quantity,
    });
    console.log(`[ai] analyze done project=${id} provider=${provider.name}`);

    const json = JSON.stringify(result);
    const analysis = await prisma.drawingAnalysis.upsert({
      where: { projectId: id },
      update: {
        provider: provider.name,
        aiResultJson: json,
        editedJson: json, // 編集の初期値はAI出力と同じ
        status: "AI解析済",
        analyzedAt: new Date(),
        confirmedBy: null,
        confirmedAt: null,
      },
      create: {
        projectId: id,
        provider: provider.name,
        aiResultJson: json,
        editedJson: json,
      },
    });

    await prisma.project.update({
      where: { id },
      data: { status: "原価確認" },
    });

    return NextResponse.json(analysis);
  } catch (e) {
    await prisma.project.update({ where: { id }, data: { status: "新規" } });
    const message = e instanceof Error ? e.message : "解析に失敗しました";
    console.error(`[ai] analyze failed project=${id}: ${message}`);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
