import { NextRequest, NextResponse } from "next/server";
import { findSimilarProjects } from "@/lib/similar";

// 類似案件の取得（MVP: ルールベース。将来AI類似検索に置換予定）
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const similar = await findSimilarProjects(id);
  return NextResponse.json(similar);
}
