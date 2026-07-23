"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AnalysisData,
  ProjectFull,
  SimilarProject,
} from "@/lib/client-types";
import { COST_CATEGORIES, calcBreakdown } from "@/lib/cost";
import { recommendedRate, sellingPrice } from "@/lib/pricing";
import { yen, pct, dateStr } from "@/lib/format";

export default function ReviewTab({
  project,
  reload,
}: {
  project: ProjectFull;
  reload: () => Promise<void>;
}) {
  const [similar, setSimilar] = useState<SimilarProject[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [orderPrice, setOrderPrice] = useState("");

  const breakdown = useMemo(
    () => calcBreakdown(project.costItems),
    [project.costItems]
  );
  const decision = project.decisions[0] ?? null;

  const recRate = project.margin
    ? recommendedRate({
        baseRate: project.margin.baseRate,
        smallLot: project.margin.smallLot,
        shortDelivery: project.margin.shortDelivery,
        specialProcess: project.margin.specialProcess,
        difficulty: project.margin.difficulty,
        risk: project.margin.risk,
        customerAdj: project.margin.customerAdj,
        salesAdj: project.margin.salesAdj,
        otherAdj: project.margin.otherAdj,
      })
    : null;
  const recPrice =
    recRate !== null ? sellingPrice(breakdown.total, recRate) : null;

  const finalPrice = decision?.finalPrice ?? null;
  const grossProfit =
    finalPrice !== null ? finalPrice - breakdown.total : null;
  const grossRate =
    finalPrice !== null && finalPrice > 0
      ? ((finalPrice - breakdown.total) / finalPrice) * 100
      : null;

  const analysis: AnalysisData | null = useMemo(() => {
    if (!project.analysis) return null;
    try {
      return JSON.parse(
        project.analysis.editedJson ?? project.analysis.aiResultJson
      );
    } catch {
      return null;
    }
  }, [project.analysis]);

  // 注意事項の自動組み立て
  const cautions: string[] = [];
  if (project.margin?.shortDelivery) cautions.push("短納期");
  if (analysis?.tolerance && analysis.tolerance !== "要確認" && analysis.tolerance !== "一般公差")
    cautions.push("公差指定あり");
  if (project.margin?.specialProcess) cautions.push("特殊加工あり");
  if (analysis?.outsourcedProcesses?.length)
    cautions.push(`外注工程: ${analysis.outsourcedProcesses.join("、")}`);
  if (analysis?.notes) cautions.push(analysis.notes);
  if (project.notes) cautions.push(project.notes);

  useEffect(() => {
    fetch(`/api/projects/${project.id}/similar`)
      .then((r) => r.json())
      .then(setSimilar)
      .catch(() => {});
  }, [project.id]);

  async function setStatus(status: string) {
    setMessage(null);
    const res = await fetch(`/api/projects/${project.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      setMessage(`ステータスを「${status}」に変更しました`);
      await reload();
    }
  }

  async function registerOrder(result: "受注" | "失注") {
    setMessage(null);
    const res = await fetch(`/api/projects/${project.id}/order`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        result,
        orderPrice: result === "受注" ? orderPrice || finalPrice : null,
      }),
    });
    if (res.ok) {
      setMessage(`${result}として登録しました`);
      await reload();
    }
  }

  return (
    <div className="space-y-4">
      {message && (
        <div className="rounded border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-700">
          {message}
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        {/* 原価内訳 */}
        <div className="card">
          <h2 className="mb-2 text-sm font-semibold">原価内訳</h2>
          <table className="w-full text-sm">
            <tbody>
              {COST_CATEGORIES.map((c) => (
                <tr key={c.key}>
                  <td className="py-1 text-gray-600">{c.label}</td>
                  <td className="tabular py-1 text-right">{yen(breakdown[c.key])}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-gray-300">
                <td className="py-2 font-semibold">総原価（製造原価）</td>
                <td className="tabular py-2 text-right font-bold">
                  {yen(breakdown.total)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 価格 */}
        <div className="card">
          <h2 className="mb-2 text-sm font-semibold">見積価格</h2>
          <table className="w-full text-sm">
            <tbody>
              <tr>
                <td className="py-1 text-gray-600">推奨粗利率</td>
                <td className="tabular py-1 text-right">
                  {recRate !== null ? pct(recRate) : "未設定"}
                </td>
              </tr>
              <tr>
                <td className="py-1 text-gray-600">推奨見積価格</td>
                <td className="tabular py-1 text-right">{yen(recPrice)}</td>
              </tr>
              <tr className="border-t border-gray-200">
                <td className="py-2 font-semibold">担当者設定価格</td>
                <td className="tabular py-2 text-right text-xl font-bold text-blue-800">
                  {finalPrice !== null ? yen(finalPrice) : "未決定"}
                </td>
              </tr>
              <tr>
                <td className="py-1 text-gray-600">粗利額</td>
                <td className="tabular py-1 text-right">{yen(grossProfit)}</td>
              </tr>
              <tr>
                <td className="py-1 text-gray-600">粗利率</td>
                <td className="tabular py-1 text-right">
                  {grossRate !== null ? pct(grossRate) : "−"}
                </td>
              </tr>
              {decision && (
                <tr>
                  <td className="py-1 text-gray-600">決定者 / 理由</td>
                  <td className="py-1 text-right text-xs">
                    {decision.decidedBy} ／ {decision.reason}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 注意事項 */}
        <div className="card">
          <h2 className="mb-2 text-sm font-semibold">注意事項</h2>
          {cautions.length > 0 ? (
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {cautions.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-400">特記事項なし</p>
          )}
        </div>
      </div>

      {/* 類似案件 */}
      <div className="card p-0">
        <div className="border-b border-gray-200 px-4 py-2 text-sm font-semibold">
          類似案件
          <span className="ml-2 text-xs font-normal text-gray-500">
            （同一顧客・材質一致・品番一致から抽出。AI類似検索は第2フェーズ）
          </span>
        </div>
        <table className="table-base">
          <thead>
            <tr>
              <th>案件ID</th>
              <th>案件名</th>
              <th>顧客</th>
              <th className="text-right">過去原価</th>
              <th className="text-right">過去見積価格</th>
              <th className="text-right">粗利率</th>
              <th className="text-right">最終受注価格</th>
              <th>結果</th>
              <th>担当者</th>
              <th>日付</th>
            </tr>
          </thead>
          <tbody>
            {similar.map((s) => (
              <tr key={s.id} className="hover:bg-blue-50">
                <td>
                  <Link
                    href={`/projects/${s.id}`}
                    className="font-medium text-blue-700 hover:underline"
                  >
                    {s.id}
                  </Link>
                </td>
                <td>{s.name}</td>
                <td>{s.customerName}</td>
                <td className="tabular text-right">{yen(s.pastCost)}</td>
                <td className="tabular text-right">{yen(s.pastPrice)}</td>
                <td className="tabular text-right">
                  {s.marginRate !== null ? pct(s.marginRate) : "−"}
                </td>
                <td className="tabular text-right">{yen(s.orderPrice)}</td>
                <td>{s.orderResult ?? "−"}</td>
                <td>{s.assignee}</td>
                <td>{dateStr(s.createdAt)}</td>
              </tr>
            ))}
            {similar.length === 0 && (
              <tr>
                <td colSpan={10} className="py-4 text-center text-gray-400">
                  類似案件が見つかりません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* アクション */}
      <div className="card">
        <h2 className="mb-3 text-sm font-semibold">見積の進行</h2>
        <div className="flex flex-wrap items-end gap-3">
          <button
            className="btn-secondary"
            onClick={() => setStatus("承認待ち")}
            disabled={!decision}
          >
            承認待ちにする
          </button>
          <button
            className="btn-primary"
            onClick={() => setStatus("見積提出済")}
            disabled={!decision}
          >
            見積提出済にする
          </button>
          <div className="mx-4 h-8 border-l border-gray-300" />
          <div className="w-40">
            <label className="label">受注価格(円)</label>
            <input
              type="number"
              className="input tabular"
              value={orderPrice}
              onChange={(e) => setOrderPrice(e.target.value)}
              placeholder={finalPrice !== null ? String(finalPrice) : ""}
            />
          </div>
          <button
            className="btn-primary"
            onClick={() => registerOrder("受注")}
            disabled={!decision}
          >
            受注として登録
          </button>
          <button
            className="btn-danger"
            onClick={() => registerOrder("失注")}
            disabled={!decision}
          >
            失注として登録
          </button>
        </div>
        {!decision && (
          <p className="mt-2 text-xs text-gray-500">
            先に「④ 価格提案」タブで価格を決定してください。
          </p>
        )}
        {project.order && (
          <p className="mt-2 text-sm">
            結果:{" "}
            <span className="font-semibold">{project.order.result}</span>
            {project.order.orderPrice !== null &&
              ` ／ 受注価格 ${yen(project.order.orderPrice)}`}
          </p>
        )}
      </div>
    </div>
  );
}
