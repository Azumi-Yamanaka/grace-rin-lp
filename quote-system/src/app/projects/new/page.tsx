"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewProjectPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/projects", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "登録に失敗しました");
      router.push(`/projects/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "登録に失敗しました");
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="mb-4 text-lg font-bold">新規見積（案件登録）</h1>
      <form onSubmit={onSubmit} className="card space-y-4">
        {error && (
          <div className="rounded border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </div>
        )}
        <div>
          <label className="label">
            案件名 <span className="text-rose-600">*</span>
          </label>
          <input
            name="name"
            required
            className="input"
            placeholder="例: 制御盤カバー製作"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">
              顧客名 <span className="text-rose-600">*</span>
            </label>
            <input
              name="customerName"
              required
              className="input"
              placeholder="例: 株式会社〇〇"
            />
          </div>
          <div>
            <label className="label">
              担当者 <span className="text-rose-600">*</span>
            </label>
            <input
              name="assignee"
              required
              className="input"
              placeholder="例: 佐藤"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">希望納期</label>
            <input name="dueDate" type="date" className="input" />
          </div>
          <div>
            <label className="label">数量</label>
            <input
              name="quantity"
              type="number"
              min={1}
              defaultValue={1}
              className="input"
            />
          </div>
        </div>
        <div>
          <label className="label">図面PDF</label>
          <input
            name="drawing"
            type="file"
            accept="application/pdf"
            className="input"
          />
          <p className="mt-1 text-xs text-gray-500">
            アップロードした図面はローカルの uploads/
            に保存されます（Git管理外）。AI解析はあとから実行できます。
          </p>
        </div>
        <div>
          <label className="label">備考</label>
          <textarea
            name="notes"
            rows={3}
            className="input"
            placeholder="短納期・特殊要求など"
          />
        </div>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => router.back()}
          >
            キャンセル
          </button>
          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting ? "登録中..." : "案件を登録"}
          </button>
        </div>
      </form>
    </div>
  );
}
