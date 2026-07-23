import {
  AIProvider,
  AnalysisContext,
  DrawingAnalysisResult,
  NEEDS_REVIEW,
} from "./types";

/**
 * APIキー不要のモックプロバイダ。
 * 板金部品の典型的な解析結果を返す（動作確認用）。
 * 一部項目を意図的に「要確認」にして、人間確認フローを試せるようにしている。
 */
export class MockProvider implements AIProvider {
  readonly name = "mock";
  readonly label = "Mock（外部送信なし・ダミーデータ）";

  async analyzeDrawing(
    _pdf: Buffer,
    context: AnalysisContext
  ): Promise<DrawingAnalysisResult> {
    // 実際のAPI呼び出しの代わりに少し待つ
    await new Promise((r) => setTimeout(r, 800));
    return {
      partName: `${context.projectName} ブラケット`,
      partNumber: "BRK-1024",
      material: "SUS304",
      dimensions: "300 x 200",
      thickness: "3mm",
      quantity: String(context.quantity),
      weight: NEEDS_REVIEW,
      machiningMethods: ["レーザー加工", "曲げ加工", "溶接"],
      processSteps: ["レーザー切断", "バリ取り", "曲げ", "溶接", "検査"],
      surfaceTreatment: NEEDS_REVIEW,
      tolerance: "±0.1（曲げ部 ±0.3）",
      purchasedParts: ["M6 圧入ナット x4"],
      outsourcedProcesses: ["電解研磨"],
      notes: "溶接ひずみに注意。外観部品のためキズ厳禁。",
    };
  }
}
