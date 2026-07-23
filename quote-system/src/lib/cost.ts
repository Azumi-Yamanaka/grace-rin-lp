// 原価計算ロジック（AIには計算させず、プログラムとして実装する）

export const COST_CATEGORIES = [
  { key: "material", label: "材料費" },
  { key: "process", label: "加工費" },
  { key: "purchased", label: "購入部品費" },
  { key: "outsource", label: "外注費" },
  { key: "other", label: "その他経費" },
] as const;

export type CostCategory = (typeof COST_CATEGORIES)[number]["key"];

export function categoryLabel(key: string): string {
  return COST_CATEGORIES.find((c) => c.key === key)?.label ?? key;
}

export interface CostItemInput {
  category: string;
  quantity: number;
  unitPrice: number;
  amount: number; // 手動上書き済みの場合があるため amount を正とする
}

export interface CostBreakdown {
  material: number;
  process: number;
  purchased: number;
  outsource: number;
  other: number;
  total: number; // 製造原価
}

/** 明細行の金額を計算する（数量 × 単価、1円未満四捨五入） */
export function lineAmount(quantity: number, unitPrice: number): number {
  return Math.round(quantity * unitPrice);
}

/** カテゴリ別内訳と製造原価を集計する */
export function calcBreakdown(items: CostItemInput[]): CostBreakdown {
  const sum = (cat: CostCategory) =>
    items
      .filter((i) => i.category === cat)
      .reduce((acc, i) => acc + i.amount, 0);
  const material = sum("material");
  const process = sum("process");
  const purchased = sum("purchased");
  const outsource = sum("outsource");
  const other = sum("other");
  return {
    material,
    process,
    purchased,
    outsource,
    other,
    total: material + process + purchased + outsource + other,
  };
}
