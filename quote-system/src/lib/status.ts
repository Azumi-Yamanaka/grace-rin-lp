// 案件ステータス定義（MVPでは手動変更。SPEC 仮定A11）

export const STATUSES = [
  "新規",
  "図面解析中",
  "原価確認",
  "見積作成中",
  "承認待ち",
  "見積提出済",
  "受注",
  "失注",
] as const;

export type ProjectStatus = (typeof STATUSES)[number];

// 一覧画面のバッジ配色（視認性重視・落ち着いた配色）
export const STATUS_COLORS: Record<string, string> = {
  新規: "bg-gray-100 text-gray-700 border-gray-300",
  図面解析中: "bg-sky-50 text-sky-700 border-sky-300",
  原価確認: "bg-amber-50 text-amber-700 border-amber-300",
  見積作成中: "bg-indigo-50 text-indigo-700 border-indigo-300",
  承認待ち: "bg-orange-50 text-orange-700 border-orange-300",
  見積提出済: "bg-blue-50 text-blue-700 border-blue-300",
  受注: "bg-emerald-50 text-emerald-700 border-emerald-300",
  失注: "bg-rose-50 text-rose-700 border-rose-300",
};
