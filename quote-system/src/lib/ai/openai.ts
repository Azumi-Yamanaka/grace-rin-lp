import {
  AIProvider,
  AnalysisContext,
  DrawingAnalysisResult,
  EXTRACTION_PROMPT,
  normalizeResult,
} from "./types";

/**
 * OpenAI API プロバイダ。
 * Responses API に PDF を input_file (base64 data URL) として送信する。
 * セキュリティ: 送信するのは図面PDF・案件名・数量のみ。ログに図面内容・キーは出さない。
 */
export class OpenAIProvider implements AIProvider {
  readonly name = "openai";
  readonly label = "OpenAI API";

  constructor(private apiKey: string, private model: string = "gpt-4o") {}

  async analyzeDrawing(
    pdf: Buffer,
    context: AnalysisContext
  ): Promise<DrawingAnalysisResult> {
    const res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: `${EXTRACTION_PROMPT}\n\n参考情報: 案件名「${context.projectName}」/ 発注予定数量 ${context.quantity}`,
              },
              {
                type: "input_file",
                filename: "drawing.pdf",
                file_data: `data:application/pdf;base64,${pdf.toString("base64")}`,
              },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      // 図面内容やAPIキーはログに残さない
      console.error(`[ai] OpenAI API error: status=${res.status}`);
      throw new Error(`OpenAI API エラー (status ${res.status})`);
    }

    const data = await res.json();
    const text: string | undefined = extractOutputText(data);
    if (!text) throw new Error("OpenAI API から解析結果を取得できませんでした");
    return normalizeResult(parseJsonLoose(text));
  }
}

function extractOutputText(data: unknown): string | undefined {
  const d = data as {
    output_text?: string;
    output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
  };
  if (typeof d.output_text === "string") return d.output_text;
  for (const item of d.output ?? []) {
    for (const c of item.content ?? []) {
      if (c.type === "output_text" && c.text) return c.text;
    }
  }
  return undefined;
}

function parseJsonLoose(text: string): Record<string, unknown> {
  const trimmed = text.replace(/^```json\s*|```\s*$/g, "").trim();
  return JSON.parse(trimmed);
}
