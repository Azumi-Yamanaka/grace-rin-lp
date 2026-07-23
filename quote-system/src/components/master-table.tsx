"use client";

import { useCallback, useEffect, useState } from "react";

export interface MasterColumn {
  key: string;
  label: string;
  type?: "text" | "number";
  required?: boolean;
  placeholder?: string;
}

interface Row {
  id: number;
  [key: string]: unknown;
}

/**
 * マスタ管理の汎用CRUDテーブル。
 * 行クリックで編集、下部のフォームで新規追加。Excelライクな表形式。
 */
export default function MasterTable({
  type,
  columns,
}: {
  type: string;
  columns: MasterColumn[];
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const res = await fetch(`/api/masters/${type}`);
    setRows(await res.json());
    setLoading(false);
  }, [type]);

  useEffect(() => {
    fetch(`/api/masters/${type}`).then(async (res) => {
      setRows(await res.json());
      setLoading(false);
    });
  }, [type]);

  function toPayload(d: Record<string, string>) {
    const payload: Record<string, unknown> = {};
    for (const col of columns) {
      const v = d[col.key] ?? "";
      payload[col.key] = col.type === "number" ? Number(v) || 0 : v || null;
      if (col.required && !v) return { error: `${col.label} は必須です` };
    }
    return { payload };
  }

  async function save() {
    const { payload, error: vErr } = toPayload(draft);
    if (vErr) return setError(vErr);
    setError(null);
    const isNew = editingId === null;
    const res = await fetch(
      isNew ? `/api/masters/${type}` : `/api/masters/${type}/${editingId}`,
      {
        method: isNew ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return setError(data.error ?? "保存に失敗しました");
    }
    setDraft({});
    setEditingId(null);
    load();
  }

  async function remove(id: number) {
    if (!confirm("この行を削除しますか？")) return;
    await fetch(`/api/masters/${type}/${id}`, { method: "DELETE" });
    if (editingId === id) {
      setEditingId(null);
      setDraft({});
    }
    load();
  }

  function startEdit(row: Row) {
    setEditingId(row.id);
    const d: Record<string, string> = {};
    for (const col of columns) d[col.key] = String(row[col.key] ?? "");
    setDraft(d);
  }

  return (
    <div>
      {error && (
        <div className="mb-3 rounded border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      )}
      <div className="card p-0">
        <table className="table-base">
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.key}>{c.label}</th>
              ))}
              <th>更新日</th>
              <th className="w-28"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={columns.length + 2}
                  className="py-8 text-center text-gray-400"
                >
                  読み込み中...
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="hover:bg-blue-50">
                  {columns.map((c) => (
                    <td
                      key={c.key}
                      className={c.type === "number" ? "tabular text-right" : ""}
                    >
                      {c.type === "number"
                        ? Number(row[c.key] ?? 0).toLocaleString("ja-JP")
                        : String(row[c.key] ?? "")}
                    </td>
                  ))}
                  <td className="text-xs text-gray-500">
                    {row.updatedAt
                      ? new Date(String(row.updatedAt)).toLocaleDateString(
                          "ja-JP"
                        )
                      : ""}
                  </td>
                  <td className="whitespace-nowrap text-right">
                    <button
                      className="text-xs text-blue-700 hover:underline"
                      onClick={() => startEdit(row)}
                    >
                      編集
                    </button>
                    <button
                      className="ml-3 text-xs text-rose-600 hover:underline"
                      onClick={() => remove(row.id)}
                    >
                      削除
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="card mt-4">
        <div className="mb-2 text-sm font-semibold">
          {editingId === null ? "新規追加" : `編集中（ID: ${editingId}）`}
        </div>
        <div className="flex flex-wrap items-end gap-3">
          {columns.map((c) => (
            <div key={c.key} className="w-40">
              <label className="label">
                {c.label}
                {c.required && <span className="text-rose-600"> *</span>}
              </label>
              <input
                type={c.type === "number" ? "number" : "text"}
                step="any"
                className="input"
                placeholder={c.placeholder}
                value={draft[c.key] ?? ""}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, [c.key]: e.target.value }))
                }
              />
            </div>
          ))}
          <div className="flex gap-2">
            <button className="btn-primary" onClick={save}>
              {editingId === null ? "追加" : "更新"}
            </button>
            {editingId !== null && (
              <button
                className="btn-secondary"
                onClick={() => {
                  setEditingId(null);
                  setDraft({});
                }}
              >
                キャンセル
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
