"use client";

import { useMemo, useState } from "react";
import { ProjectFull } from "@/lib/client-types";
import { calcBreakdown } from "@/lib/cost";
import {
  MARGIN_FACTOR_LABELS,
  MarginFactors,
  clampRate,
  marginRateOf,
  recommendedRate,
  sellingPrice,
} from "@/lib/pricing";
import { yen, pct, dateTimeStr } from "@/lib/format";

const EMPTY: MarginFactors = {
  baseRate: 25,
  smallLot: 0,
  shortDelivery: 0,
  specialProcess: 0,
  difficulty: 0,
  risk: 0,
  customerAdj: 0,
  salesAdj: 0,
  otherAdj: 0,
};

export default function PricingTab({
  project,
  reload,
}: {
  project: ProjectFull;
  reload: () => Promise<void>;
}) {
  const cost = useMemo(
    () => calcBreakdown(project.costItems).total,
    [project.costItems]
  );

  const [factors, setFactors] = useState<MarginFactors>(
    project.margin ? { ...EMPTY, ...project.margin } : EMPTY
  );
  const [otherReason, setOtherReason] = useState(
    project.margin?.otherReason ?? ""
  );
  const [message, setMessage] = useState<string | null>(null);

  // 担当者の最終決定
  const [finalRate, setFinalRate] = useState<string>("");
  const [finalPrice, setFinalPrice] = useState<string>("");
  const [reason, setReason] = useState("");
  const [decidedBy, setDecidedBy] = useState(project.assignee);
  const [decisionMsg, setDecisionMsg] = useState<string | null>(null);

  const recRate = recommendedRate(factors);
  const recPrice = sellingPrice(cost, recRate);

  // 保存後に親から新しい粗利設定が来たら同期する（レンダー中の状態調整パターン）
  const [prevMargin, setPrevMargin] = useState(project.margin);
  if (project.margin !== prevMargin) {
    setPrevMargin(project.margin);
    if (project.margin) setFactors({ ...EMPTY, ...project.margin });
  }

  // 未入力なら推奨値を初期値として表示する
  if (finalRate === "" && cost > 0) setFinalRate(String(recRate));
  if (finalPrice === "" && cost > 0) setFinalPrice(String(recPrice));

  function setFactor(key: keyof MarginFactors, value: string) {
    setFactors((f) => ({ ...f, [key]: Number(value) || 0 }));
  }

  // 粗利率⇔価格の連動入力
  function onRateChange(v: string) {
    setFinalRate(v);
    const r = Number(v);
    if (Number.isFinite(r) && cost > 0)
      setFinalPrice(String(sellingPrice(cost, clampRate(r))));
  }
  function onPriceChange(v: string) {
    setFinalPrice(v);
    const p = Number(v);
    if (Number.isFinite(p) && p > 0)
      setFinalRate(String(marginRateOf(p, cost)));
  }

  async function saveMargin() {
    setMessage(null);
    const res = await fetch(`/api/projects/${project.id}/margin`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...factors, otherReason }),
    });
    if (res.ok) {
      setMessage("粗利設定を保存しました");
      await reload();
    } else {
      setMessage("保存に失敗しました");
    }
  }

  async function saveDecision() {
    setDecisionMsg(null);
    const res = await fetch(`/api/projects/${project.id}/decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        aiRate: recRate,
        aiPrice: recPrice,
        finalRate: Number(finalRate),
        finalPrice: Number(finalPrice),
        reason,
        decidedBy,
      }),
    });
    if (res.ok) {
      setDecisionMsg("価格決定を保存しました（ステータス: 承認待ち）");
      setReason("");
      await reload();
    } else {
      const data = await res.json().catch(() => ({}));
      setDecisionMsg(data.error ?? "保存に失敗しました");
    }
  }

  const changed =
    Number(finalRate) !== recRate || Number(finalPrice) !== recPrice;

  return (
    <div className="space-y-4">
      {cost === 0 && (
        <div className="rounded border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-800">
          原価が未入力です。「③ 原価計算」タブで原価明細を登録してください。
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        {/* 左: 粗利率の組み立て（なぜこの価格かを可視化） */}
        <div className="card">
          <h2 className="mb-1 text-sm font-semibold">粗利率の組み立て</h2>
          <p className="mb-3 text-xs text-gray-500">
            推奨粗利率 = 基準粗利率 + 各種加算/調整。内訳がそのまま提案根拠になります。
          </p>
          <table className="table-base">
            <tbody>
              {MARGIN_FACTOR_LABELS.map((f) => (
                <tr key={f.key}>
                  <td className="w-40 text-xs text-gray-600">{f.label}</td>
                  <td className="w-32">
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        step="0.5"
                        className="input tabular text-right"
                        value={factors[f.key]}
                        onChange={(e) => setFactor(f.key, e.target.value)}
                      />
                      <span className="text-xs text-gray-500">%</span>
                    </div>
                  </td>
                  <td className="text-xs text-gray-400">
                    {f.key === "baseRate"
                      ? "会社の標準粗利率"
                      : f.key === "customerAdj"
                        ? "継続顧客は−、新規リスクは＋"
                        : f.key === "otherAdj"
                          ? otherReason || ""
                          : ""}
                  </td>
                </tr>
              ))}
              <tr>
                <td className="text-xs text-gray-600">その他調整の理由</td>
                <td colSpan={2}>
                  <input
                    className="input"
                    value={otherReason}
                    onChange={(e) => setOtherReason(e.target.value)}
                    placeholder="例: 初回取引のため上乗せ"
                  />
                </td>
              </tr>
            </tbody>
          </table>
          <div className="mt-3 flex items-center justify-between">
            {message && <span className="text-xs text-blue-700">{message}</span>}
            <button className="btn-secondary ml-auto" onClick={saveMargin}>
              粗利設定を保存
            </button>
          </div>
        </div>

        {/* 右: 推奨価格と最終決定 */}
        <div className="space-y-4">
          <div className="card border-blue-300">
            <h2 className="mb-2 text-sm font-semibold">システム推奨（自動確定しません）</h2>
            <table className="w-full text-sm">
              <tbody>
                <tr>
                  <td className="py-1 text-gray-600">製造原価</td>
                  <td className="tabular py-1 text-right font-medium">{yen(cost)}</td>
                </tr>
                <tr>
                  <td className="py-1 text-gray-600">推奨粗利率</td>
                  <td className="tabular py-1 text-right font-medium">{pct(recRate)}</td>
                </tr>
                <tr className="border-t border-gray-200">
                  <td className="py-2 font-semibold text-blue-800">推奨見積価格</td>
                  <td className="tabular py-2 text-right text-xl font-bold text-blue-800">
                    {yen(recPrice)}
                  </td>
                </tr>
              </tbody>
            </table>
            <p className="mt-1 text-xs text-gray-500">
              計算式: 売価 = 原価 ÷ (1 − 粗利率) = {yen(cost)} ÷ (1 −{" "}
              {(recRate / 100).toFixed(3)})
            </p>
          </div>

          <div className="card">
            <h2 className="mb-2 text-sm font-semibold">担当者の最終決定</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">担当者設定 粗利率(%)</label>
                <input
                  type="number"
                  step="0.1"
                  className="input tabular text-right"
                  value={finalRate}
                  onChange={(e) => onRateChange(e.target.value)}
                />
              </div>
              <div>
                <label className="label">担当者設定 価格(円)</label>
                <input
                  type="number"
                  className="input tabular text-right"
                  value={finalPrice}
                  onChange={(e) => onPriceChange(e.target.value)}
                />
              </div>
            </div>
            {changed && (
              <div className="mt-2 rounded border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs text-amber-800">
                推奨値から変更されています（粗利率{" "}
                {pct(Number(finalRate) - recRate)} / 価格{" "}
                {yen(Number(finalPrice) - recPrice)}）。変更理由が必須です。
              </div>
            )}
            <div className="mt-3">
              <label className="label">
                変更理由{changed && <span className="text-rose-600"> *</span>}
              </label>
              <textarea
                rows={2}
                className="input"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="例: 競合との相見積のため"
              />
            </div>
            <div className="mt-3 flex items-end justify-end gap-3">
              <div className="w-36">
                <label className="label">決定担当者</label>
                <input
                  className="input"
                  value={decidedBy}
                  onChange={(e) => setDecidedBy(e.target.value)}
                />
              </div>
              <button className="btn-primary" onClick={saveDecision} disabled={cost === 0}>
                価格を決定して保存
              </button>
            </div>
            {decisionMsg && (
              <div className="mt-2 text-xs text-blue-700">{decisionMsg}</div>
            )}
          </div>
        </div>
      </div>

      {/* 決定履歴（経験値データ） */}
      <div className="card p-0">
        <div className="border-b border-gray-200 px-4 py-2 text-sm font-semibold">
          価格決定履歴（AI推奨との差分を記録）
        </div>
        <table className="table-base">
          <thead>
            <tr>
              <th className="text-right">AI推奨粗利率</th>
              <th className="text-right">AI推奨価格</th>
              <th className="text-right">決定粗利率</th>
              <th className="text-right">決定価格</th>
              <th className="text-right">差分(率)</th>
              <th className="text-right">差分(額)</th>
              <th>変更理由</th>
              <th>決定者</th>
              <th>日時</th>
            </tr>
          </thead>
          <tbody>
            {project.decisions.map((d) => (
              <tr key={d.id}>
                <td className="tabular text-right">{pct(d.aiRate)}</td>
                <td className="tabular text-right">{yen(d.aiPrice)}</td>
                <td className="tabular text-right font-medium">{pct(d.finalRate)}</td>
                <td className="tabular text-right font-medium">{yen(d.finalPrice)}</td>
                <td className={`tabular text-right ${d.rateDiff < 0 ? "text-rose-600" : d.rateDiff > 0 ? "text-emerald-700" : ""}`}>
                  {d.rateDiff > 0 ? "+" : ""}
                  {pct(d.rateDiff)}
                </td>
                <td className={`tabular text-right ${d.priceDiff < 0 ? "text-rose-600" : d.priceDiff > 0 ? "text-emerald-700" : ""}`}>
                  {d.priceDiff > 0 ? "+" : ""}
                  {yen(d.priceDiff)}
                </td>
                <td>{d.reason}</td>
                <td>{d.decidedBy}</td>
                <td className="text-xs text-gray-500">{dateTimeStr(d.decidedAt)}</td>
              </tr>
            ))}
            {project.decisions.length === 0 && (
              <tr>
                <td colSpan={9} className="py-4 text-center text-gray-400">
                  まだ価格決定がありません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
