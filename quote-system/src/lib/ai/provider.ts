import { AIProvider } from "./types";
import { MockProvider } from "./mock";
import { GeminiProvider } from "./gemini";
import { OpenAIProvider } from "./openai";

/**
 * AIプロバイダのファクトリ。
 * - AI_PROVIDER 環境変数で明示指定（mock / gemini / openai）
 * - 未指定なら GEMINI_API_KEY → OPENAI_API_KEY の順で自動判定
 * - キーが無ければ MockProvider（外部送信なし）
 */
export function getAIProvider(): AIProvider {
  const forced = process.env.AI_PROVIDER?.toLowerCase();
  const geminiKey = process.env.GEMINI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (forced === "mock") return new MockProvider();
  if (forced === "gemini") {
    if (!geminiKey) throw new Error("GEMINI_API_KEY が設定されていません");
    return new GeminiProvider(geminiKey);
  }
  if (forced === "openai") {
    if (!openaiKey) throw new Error("OPENAI_API_KEY が設定されていません");
    return new OpenAIProvider(openaiKey);
  }

  if (geminiKey) return new GeminiProvider(geminiKey);
  if (openaiKey) return new OpenAIProvider(openaiKey);
  return new MockProvider();
}

/** 設定画面・解析前確認に使う現在のプロバイダ情報（キー自体は返さない） */
export function getProviderInfo() {
  const provider = getAIProvider();
  return {
    name: provider.name,
    label: provider.label,
    external: provider.name !== "mock",
    // 送信内容の説明（ブラックボックス化を避けるため画面に表示する）
    sends:
      provider.name === "mock"
        ? "外部送信なし（ローカルでダミーデータを生成）"
        : "図面PDF本体・案件名・数量のみ送信（顧客名・金額情報は送信しません）",
  };
}
