// 売価・粗利計算ロジック
// 売価 = 原価 ÷ (1 − 粗利率)  ※粗利率は売価基準（SPEC 仮定A5）

export interface MarginFactors {
  baseRate: number; // 基準粗利率 %
  smallLot: number; // 小ロット加算
  shortDelivery: number; // 短納期加算
  specialProcess: number; // 特殊加工加算
  difficulty: number; // 難易度加算
  risk: number; // リスク加算
  customerAdj: number; // 顧客別調整
  salesAdj: number; // 営業調整
  otherAdj: number; // その他調整
}

export const MARGIN_FACTOR_LABELS: { key: keyof MarginFactors; label: string }[] =
  [
    { key: "baseRate", label: "基準粗利率" },
    { key: "smallLot", label: "小ロット加算" },
    { key: "shortDelivery", label: "短納期加算" },
    { key: "specialProcess", label: "特殊加工加算" },
    { key: "difficulty", label: "難易度加算" },
    { key: "risk", label: "リスク加算" },
    { key: "customerAdj", label: "顧客別調整" },
    { key: "salesAdj", label: "営業調整" },
    { key: "otherAdj", label: "その他調整" },
  ];

/** 粗利率(%)を 0〜95 にクランプする（100%以上は計算不能のため） */
export function clampRate(rate: number): number {
  return Math.min(95, Math.max(0, rate));
}

/** 推奨粗利率 = 基準粗利率 + 各種加算/調整 の合計 */
export function recommendedRate(f: MarginFactors): number {
  const total =
    f.baseRate +
    f.smallLot +
    f.shortDelivery +
    f.specialProcess +
    f.difficulty +
    f.risk +
    f.customerAdj +
    f.salesAdj +
    f.otherAdj;
  return clampRate(Math.round(total * 10) / 10);
}

/** 売価 = 原価 ÷ (1 − 粗利率)。1円未満切り上げ */
export function sellingPrice(cost: number, ratePercent: number): number {
  const rate = clampRate(ratePercent) / 100;
  if (cost <= 0) return 0;
  return Math.ceil(cost / (1 - rate));
}

/** 売価と原価から粗利率(%)を逆算する */
export function marginRateOf(price: number, cost: number): number {
  if (price <= 0) return 0;
  return Math.round(((price - cost) / price) * 1000) / 10;
}
