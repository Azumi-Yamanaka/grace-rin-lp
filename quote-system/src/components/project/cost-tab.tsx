"use client";

import { useEffect, useMemo, useState } from "react";
import { CostItemRow, ProjectFull } from "@/lib/client-types";
import { COST_CATEGORIES, calcBreakdown, categoryLabel, lineAmount } from "@/lib/cost";
import { yen, dateTimeStr } from "@/lib/format";

interface MasterOption {
  id: number;
  label: string;
  code: string | null;
  name: string;
  unitPrice: number;
  unit: string | null;
}

interface Adjustment {
  itemName: string;
  field: string;
  beforeValue: string;
  afterValue: string;
  reason: string;
  editedBy: string;
}

export default function CostTab({
  project,
  reload,
}: {
  project: ProjectFull;
  reload: () => Promise<void>;
}) {
  const [items, setItems] = useState<CostItemRow[]>(project.costItems);
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [masters, setMasters] = useState<Record<string, MasterOption[]>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // 追加フォーム
  const [addCategory, setAddCategory] = useState("material");
  const [addMasterId, setAddMasterId] = useState("");
  const [addName, setAddName] = useState("");
  const [addQty, setAddQty] = useState("1");
  const [addUnitPrice, setAddUnitPrice] = useState("");

  // 手動修正モーダル
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editReason, setEditReason] = useState("");
  const [editBy, setEditBy] = useState(project.assignee);

  // 保存後などに親から新しい明細が来たら同期する（レンダー中の状態調整パターン）
  const [prevItems, setPrevItems] = useState(project.costItems);
  if (project.costItems !== prevItems) {
    setPrevItems(project.costItems);
    setItems(project.costItems);
  }

  useEffect(() => {
    (async () => {
      const [materials, processes, purchased, outsource] = await Promise.all(
        ["materials", "processes", "purchased", "outsource"].map((t) =>
          fetch(`/api/masters/${t}`).then((r) => r.json())
        )
      );
      setMasters({
        material: materials.map((m: { id: number; code: string; name: string; unitPrice: number; unit: string }) => ({
          id: m.id, label: `${m.code} ${m.name}（${m.unitPrice}円/${m.unit}）`,
          code: m.code, name: m.name, unitPrice: m.unitPrice, unit: m.unit,
        })),
        process: processes.map((p: { id: number; code: string; name: string; unitPrice: number; chargeUnit: string }) => ({
          id: p.id, label: `${p.code} ${p.name}（${p.unitPrice}円/${p.chargeUnit}）`,
          code: p.code, name: p.name, unitPrice: p.unitPrice, unit: p.chargeUnit,
        })),
        purchased: purchased.map((p: { id: number; code: string; name: string; unitPrice: number }) => ({
          id: p.id, label: `${p.code} ${p.name}（${p.unitPrice}円/個）`,
          code: p.code, name: p.name, unitPrice: p.unitPrice, unit: "個",
        })),
        outsource: outsource.map((o: { id: number; processName: string; supplier: string; basePrice: number }) => ({
          id: o.id, label: `${o.processName}（${o.supplier}・基準${o.basePrice}円）`,
          code: null, name: `${o.processName}（${o.supplier}）`, unitPrice: o.basePrice, unit: "式",
        })),
      });
    })();
  }, []);

  const breakdown = useMemo(() => calcBreakdown(items), [items]);
  const masterOptions = masters[addCategory] ?? [];

  function addItem() {
    let row: CostItemRow;
    if (addCategory === "other" || addMasterId === "") {
      if (!addName.trim()) return;
      const qty = Number(addQty) || 1;
      const price = Number(addUnitPrice) || 0;
      row = {
        category: addCategory, code: null, name: addName.trim(),
        quantity: qty, unit: null, unitPrice: price,
        amount: lineAmount(qty, price), source: "auto", sortOrder: items.length,
      };
    } else {
      const m = masterOptions.find((o) => String(o.id) === addMasterId);
      if (!m) return;
      const qty = Number(addQty) || 1;
      row = {
        category: addCategory, code: m.code, name: m.name,
        quantity: qty, unit: m.unit, unitPrice: m.unitPrice,
        amount: lineAmount(qty, m.unitPrice), source: "auto", sortOrder: items.length,
      };
    }
    setItems((arr) => [...arr, row]);
    setAddMasterId("");
    setAddName("");
    setAddQty("1");
    setAddUnitPrice("");
  }

  function updateItem(idx: number, patch: Partial<CostItemRow>) {
    setItems((arr) =>
      arr.map((it, i) => {
        if (i !== idx) return it;
        const next = { ...it, ...patch };
        // 手動上書き行以外は 金額 = 数量 × 単価 を自動計算
        if (next.source !== "manual")
          next.amount = lineAmount(next.quantity, next.unitPrice);
        return next;
      })
    );
  }

  function removeItem(idx: number) {
    setItems((arr) => arr.filter((_, i) => i !== idx));
  }

  function openManualEdit(idx: number) {
    setEditIdx(idx);
    setEditAmount(String(items[idx].amount));
    setEditReason("");
  }

  function applyManualEdit() {
    if (editIdx === null) return;
    if (!editReason.trim()) {
      alert("修正理由を入力してください（必須）");
      return;
    }
    const before = items[editIdx].amount;
    const after = Number(editAmount) || 0;
    setAdjustments((a) => [
      ...a,
      {
        itemName: items[editIdx].name,
        field: "金額",
        beforeValue: String(before),
        afterValue: String(after),
        reason: editReason.trim(),
        editedBy: editBy || "不明",
      },
    ]);
    setItems((arr) =>
      arr.map((it, i) =>
        i === editIdx ? { ...it, amount: after, source: "manual" } : it
      )
    );
    setEditIdx(null);
  }

  async function save() {
    setSaving(true);
    setMessage(null);
    const res = await fetch(`/api/projects/${project.id}/cost`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items, adjustments }),
    });
    setSaving(false);
    if (res.ok) {
      setAdjustments([]);
      setMessage("原価明細を保存しました");
      await reload();
    } else {
      const data = await res.json().catch(() => ({}));
      setMessage(data.error ?? "保存に失敗しました");
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-6 gap-3">
        {COST_CATEGORIES.map((c) => (
          <div key={c.key} className="card py-3">
            <div className="text-xs text-gray-500">{c.label}</div>
            <div className="tabular mt-0.5 text-lg font-bold">
              {yen(breakdown[c.key])}
            </div>
          </div>
        ))}
        <div className="card border-blue-300 bg-blue-50 py-3">
          <div className="text-xs font-semibold text-blue-700">製造原価</div>
          <div className="tabular mt-0.5 text-lg font-bold text-blue-800">
            {yen(breakdown.total)}
          </div>
        </div>
      </div>

      <div className="card p-0">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-2">
          <span className="text-sm font-semibold">原価明細</span>
          {message && <span className="text-xs text-blue-700">{message}</span>}
          <button className="btn-primary" onClick={save} disabled={saving}>
            {saving ? "保存中..." : "明細を保存"}
          </button>
        </div>
        <table className="table-base">
          <thead>
            <tr>
              <th className="w-24">区分</th>
              <th>名称</th>
              <th className="w-24 text-right">数量</th>
              <th className="w-16">単位</th>
              <th className="w-28 text-right">単価</th>
              <th className="w-32 text-right">金額</th>
              <th className="w-40"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, idx) => (
              <tr key={idx} className={it.source === "manual" ? "bg-amber-50" : ""}>
                <td className="text-xs">{categoryLabel(it.category)}</td>
                <td>
                  {it.name}
                  {it.code && (
                    <span className="ml-1 text-xs text-gray-400">[{it.code}]</span>
                  )}
                </td>
                <td className="text-right">
                  <input
                    type="number"
                    step="any"
                    className="input tabular text-right"
                    value={it.quantity}
                    onChange={(e) =>
                      updateItem(idx, { quantity: Number(e.target.value) || 0 })
                    }
                  />
                </td>
                <td className="text-xs">{it.unit ?? "−"}</td>
                <td className="text-right">
                  <input
                    type="number"
                    step="any"
                    className="input tabular text-right"
                    value={it.unitPrice}
                    onChange={(e) =>
                      updateItem(idx, { unitPrice: Number(e.target.value) || 0 })
                    }
                  />
                </td>
                <td className="tabular text-right font-medium">
                  {yen(it.amount)}
                  {it.source === "manual" && (
                    <span className="ml-1 rounded bg-amber-200 px-1 text-[10px] text-amber-800">
                      手動
                    </span>
                  )}
                </td>
                <td className="whitespace-nowrap text-right">
                  <button
                    className="text-xs text-blue-700 hover:underline"
                    onClick={() => openManualEdit(idx)}
                  >
                    金額を手動修正
                  </button>
                  <button
                    className="ml-3 text-xs text-rose-600 hover:underline"
                    onClick={() => removeItem(idx)}
                  >
                    削除
                  </button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={7} className="py-6 text-center text-gray-400">
                  明細がありません。下のフォームから追加してください。
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <div className="flex flex-wrap items-end gap-3 border-t border-gray-200 bg-gray-50 px-4 py-3">
          <div className="w-32">
            <label className="label">区分</label>
            <select
              className="input"
              value={addCategory}
              onChange={(e) => {
                setAddCategory(e.target.value);
                setAddMasterId("");
              }}
            >
              {COST_CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          {addCategory !== "other" && (
            <div className="w-72">
              <label className="label">マスタから選択</label>
              <select
                className="input"
                value={addMasterId}
                onChange={(e) => setAddMasterId(e.target.value)}
              >
                <option value="">（直接入力）</option>
                {masterOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          )}
          {(addCategory === "other" || addMasterId === "") && (
            <>
              <div className="w-48">
                <label className="label">名称</label>
                <input
                  className="input"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  placeholder="例: 段取り費"
                />
              </div>
              <div className="w-28">
                <label className="label">単価(円)</label>
                <input
                  type="number"
                  step="any"
                  className="input"
                  value={addUnitPrice}
                  onChange={(e) => setAddUnitPrice(e.target.value)}
                />
              </div>
            </>
          )}
          <div className="w-24">
            <label className="label">数量</label>
            <input
              type="number"
              step="any"
              className="input"
              value={addQty}
              onChange={(e) => setAddQty(e.target.value)}
            />
          </div>
          <button className="btn-secondary" onClick={addItem}>
            ＋ 行を追加
          </button>
        </div>
      </div>

      {/* 修正履歴 */}
      <div className="card p-0">
        <div className="border-b border-gray-200 px-4 py-2 text-sm font-semibold">
          手動修正履歴
          {adjustments.length > 0 && (
            <span className="ml-2 text-xs font-normal text-amber-700">
              （未保存の修正 {adjustments.length} 件あり — 「明細を保存」で確定します）
            </span>
          )}
        </div>
        <table className="table-base">
          <thead>
            <tr>
              <th>対象</th>
              <th>項目</th>
              <th className="text-right">修正前</th>
              <th className="text-right">修正後</th>
              <th>修正理由</th>
              <th>担当</th>
              <th>日時</th>
            </tr>
          </thead>
          <tbody>
            {adjustments.map((a, i) => (
              <tr key={`pending-${i}`} className="bg-amber-50">
                <td>{a.itemName}</td>
                <td>{a.field}</td>
                <td className="tabular text-right">{yen(Number(a.beforeValue))}</td>
                <td className="tabular text-right">{yen(Number(a.afterValue))}</td>
                <td>{a.reason}</td>
                <td>{a.editedBy}</td>
                <td className="text-xs text-gray-400">未保存</td>
              </tr>
            ))}
            {project.costLogs.map((log) => (
              <tr key={log.id}>
                <td>{log.itemName}</td>
                <td>{log.field}</td>
                <td className="tabular text-right">{yen(Number(log.beforeValue))}</td>
                <td className="tabular text-right">{yen(Number(log.afterValue))}</td>
                <td>{log.reason}</td>
                <td>{log.editedBy}</td>
                <td className="text-xs text-gray-500">{dateTimeStr(log.createdAt)}</td>
              </tr>
            ))}
            {adjustments.length === 0 && project.costLogs.length === 0 && (
              <tr>
                <td colSpan={7} className="py-4 text-center text-gray-400">
                  修正履歴はありません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 手動修正モーダル */}
      {editIdx !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="w-96 rounded-md bg-white p-5 shadow-lg">
            <h3 className="mb-3 text-sm font-bold">
              金額の手動修正: {items[editIdx]?.name}
            </h3>
            <div className="space-y-3">
              <div>
                <label className="label">
                  修正後の金額(円)（現在 {yen(items[editIdx]?.amount)}）
                </label>
                <input
                  type="number"
                  className="input tabular"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                />
              </div>
              <div>
                <label className="label">
                  修正理由 <span className="text-rose-600">*</span>
                </label>
                <textarea
                  rows={2}
                  className="input"
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  placeholder="例: 材料ロスを考慮して増額"
                />
              </div>
              <div>
                <label className="label">修正者</label>
                <input
                  className="input"
                  value={editBy}
                  onChange={(e) => setEditBy(e.target.value)}
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button className="btn-secondary" onClick={() => setEditIdx(null)}>
                キャンセル
              </button>
              <button className="btn-primary" onClick={applyManualEdit}>
                修正を適用
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
