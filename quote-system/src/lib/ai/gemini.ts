import {
  AIProvider,
  AnalysisContext,
  DrawingAnalysisResult,
  EXTRACTION_PROMPT,
  normalizeResult,
} from "./types";

/**
 * Gemini API プロバイダ。
 * 図面PDFを inline_data として送信し、JSONを抽出する。
 * セキュリティ: 送信するのは図面PDF・案件名・数量のみ。ログに図面内容・キーは出さない。
 */
export class GeminiProvider implements AIProvider {
  readonly name = "gemini";
  readonly label = "Google Gemini API";

  constructor(
    private apiKey: string,
    private model: string = "gemini-2.0-flash"
  ) {}

  async analyzeDrawing(
    pdf: Buffer,
    context: AnalysisContext
  ): Promise<DrawingAnalysisResult> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent`;
    const body = {
      contents: [
        {
          parts: [
            {
              text: `${EXTRACTION_PROMPT}\n\n参考情報: 案件名「${context.projectName}」/ 発注予定数量 ${context.quantity}`,
            },
            {
              inline_data: {
                mime_type: "application/pdf",
                data: pdf.toString("base64"),
              },
            },
          ],
        },
      ],
      generationConfig: { response_mime_type: "application/json" },
    };

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": this.apiKey,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      // 図面内容やAPIキーはログに残さない
      console.error(`[ai] Gemini API error: status=${res.status}`);
      throw new Error(`Gemini API エラー (status ${res.status})`);
    }

    const data = await res.json();
    const text: string | undefined =
      data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("Gemini API から解析結果を取得できませんでした");
    return normalizeResult(parseJsonLoose(text));
  }
}

function parseJsonLoose(text: string): Record<string, unknown> {
  const trimmed = text.replace(/^```json\s*|```\s*$/g, "").trim();
  return JSON.parse(trimmed);
}
