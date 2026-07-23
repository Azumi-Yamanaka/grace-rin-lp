import { NextResponse } from "next/server";
import { getProviderInfo } from "@/lib/ai/provider";

// 現在のAIプロバイダ情報（APIキーは含まない）
export async function GET() {
  return NextResponse.json(getProviderInfo());
}
