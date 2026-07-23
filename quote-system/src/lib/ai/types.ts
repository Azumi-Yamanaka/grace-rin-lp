// 図面解析で取得する項目。AIが読み取れなかった項目は「要確認」を入れる
export const NEEDS_REVIEW = "要確認";

export interface DrawingAnalysisResult {
  partName: string; // 部品名
  partNumber: string; // 品番
  material: string; // 材質
  dimensions: string; // 寸法
  thickness: string; // 板厚
  quantity: string; // 数量
  weight: string; // 重量
  machiningMethods: string[]; // 加工方法
  processSteps: string[]; // 加工工程
  surfaceTreatment: string; // 表面処理
  tolerance: string; // 公差
  purchasedParts: string[]; // 購入部品
  outsourcedProcesses: string[]; // 外注工程
  notes: string; // その他注意事項
}

// AIに送信する案件メタ情報（顧客名は送信しない: SPEC 仮定A12）
export interface AnalysisContext {
  projectName: string;
  quantity: number;
}

export interface AIProvider {
  /** プロバイダ識別子 (mock / gemini / openai) */
  readonly name: string;
  /** 表示用ラベル */
  readonly label: string;
  /** 図面PDFを解析して構造化データを返す */
  analyzeDrawing(
    pdf: Buffer,
    context: AnalysisContext
  ): Promise<DrawingAnalysisResult>;
}

/** 欠損項目を「要確認」で埋めて DrawingAnalysisResult を正規化する */
export function normalizeResult(
  raw: Partial<DrawingAnalysisResult> | Record<string, unknown>
): DrawingAnalysisResult {
  const r = raw as Partial<DrawingAnalysisResult>;
  const str = (v: unknown): string =>
    typeof v === "string" && v.trim() !== "" ? v.trim() : NEEDS_REVIEW;
  const arr = (v: unknown): string[] =>
    Array.isArray(v) && v.length > 0
      ? v.map((x) => String(x)).filter((x) => x.trim() !== "")
      : [NEEDS_REVIEW];
  return {
    partName: str(r.partName),
    partNumber: str(r.partNumber),
    material: str(r.material),
    dimensions: str(r.dimensions),
    thickness: str(r.thickness),
    quantity: str(r.quantity),
    weight: str(r.weight),
    machiningMethods: arr(r.machiningMethods),
    processSteps: arr(r.processSteps),
    surfaceTreatment: str(r.surfaceTreatment),
    tolerance: str(r.tolerance),
    purchasedParts: Array.isArray(r.purchasedParts)
      ? r.purchasedParts.map(String)
      : [],
    outsourcedProcesses: Array.isArray(r.outsourcedProcesses)
      ? r.outsourcedProcesses.map(String)
      : [],
    notes: typeof r.notes === "string" ? r.notes : "",
  };
}

/** AIへの抽出指示プロンプト（Gemini / OpenAI 共通） */
export const EXTRACTION_PROMPT = `あなたは製造業（板金・機械加工）の図面読解の専門家です。
添付の図面PDFから以下の情報を抽出し、JSONのみを出力してください。
読み取れない・図面に記載がない項目は文字列 "要確認" を入れてください。

出力形式:
{
  "partName": "部品名",
  "partNumber": "品番",
  "material": "材質 (例: SUS304)",
  "dimensions": "寸法 (例: 300x200)",
  "thickness": "板厚 (例: 3mm)",
  "quantity": "図面記載の数量",
  "weight": "重量 (例: 2.4kg)",
  "machiningMethods": ["加工方法の配列 (例: レーザー加工, 曲げ加工)"],
  "processSteps": ["加工工程の順序配列"],
  "surfaceTreatment": "表面処理",
  "tolerance": "公差",
  "purchasedParts": ["購入部品の配列 (無ければ空配列)"],
  "outsourcedProcesses": ["外注が必要な工程の配列 (無ければ空配列)"],
  "notes": "その他注意事項"
}`;
