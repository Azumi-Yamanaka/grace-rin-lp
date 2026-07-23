"use client";

import { useState } from "react";
import { ProjectFull } from "@/lib/client-types";
import { STATUSES } from "@/lib/status";

export default function InfoTab({
  project,
  reload,
}: {
  project: ProjectFull;
  reload: () => Promise<void>;
}) {
  const [form, setForm] = useState({
    name: project.name,
    customerName: project.customerName,
    assignee: project.assignee,
    dueDate: project.dueDate ? project.dueDate.slice(0, 10) : "",
    quantity: String(project.quantity),
    notes: project.notes ?? "",
    status: project.status,
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  async function save() {
    setSaving(true);
    setMessage(null);
    const res = await fetch(`/api/projects/${project.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        quantity: Number(form.quantity) || 1,
        dueDate: form.dueDate || null,
      }),
    });
    setSaving(false);
    if (res.ok) {
      setMessage("保存しました");
      await reload();
    } else {
      const data = await res.json().catch(() => ({}));
      setMessage(data.error ?? "保存に失敗しました");
    }
  }

  async function uploadDrawing(file: File) {
    setUploading(true);
    const fd = new FormData();
    fd.append("drawing", file);
    const res = await fetch(`/api/projects/${project.id}/drawing`, {
      method: "POST",
      body: fd,
    });
    setUploading(false);
    if (res.ok) {
      setMessage("図面をアップロードしました");
      await reload();
    } else {
      const data = await res.json().catch(() => ({}));
      setMessage(data.error ?? "アップロードに失敗しました");
    }
  }

  const set = (key: keyof typeof form) => (v: string) =>
    setForm((f) => ({ ...f, [key]: v }));

  return (
    <div className="grid max-w-4xl grid-cols-2 gap-4">
      <div className="card space-y-3">
        <h2 className="text-sm font-semibold">基本情報</h2>
        {message && (
          <div className="rounded border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs text-blue-700">
            {message}
          </div>
        )}
        <div>
          <label className="label">案件名</label>
          <input
            className="input"
            value={form.name}
            onChange={(e) => set("name")(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">顧客名</label>
            <input
              className="input"
              value={form.customerName}
              onChange={(e) => set("customerName")(e.target.value)}
            />
          </div>
          <div>
            <label className="label">担当者</label>
            <input
              className="input"
              value={form.assignee}
              onChange={(e) => set("assignee")(e.target.value)}
            />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="label">希望納期</label>
            <input
              type="date"
              className="input"
              value={form.dueDate}
              onChange={(e) => set("dueDate")(e.target.value)}
            />
          </div>
          <div>
            <label className="label">数量</label>
            <input
              type="number"
              min={1}
              className="input"
              value={form.quantity}
              onChange={(e) => set("quantity")(e.target.value)}
            />
          </div>
          <div>
            <label className="label">ステータス</label>
            <select
              className="input"
              value={form.status}
              onChange={(e) => set("status")(e.target.value)}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="label">備考</label>
          <textarea
            rows={3}
            className="input"
            value={form.notes}
            onChange={(e) => set("notes")(e.target.value)}
          />
        </div>
        <div className="flex justify-end">
          <button className="btn-primary" onClick={save} disabled={saving}>
            {saving ? "保存中..." : "保存"}
          </button>
        </div>
      </div>

      <div className="card space-y-3">
        <h2 className="text-sm font-semibold">図面PDF</h2>
        {project.drawingPath ? (
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-gray-500">ファイル名: </span>
              {project.drawingName}
            </div>
            <a
              href={`/api/projects/${project.id}/drawing`}
              target="_blank"
              className="btn-secondary"
            >
              図面を開く
            </a>
          </div>
        ) : (
          <p className="text-sm text-gray-500">
            図面が未アップロードです。AI解析には図面PDFが必要です。
          </p>
        )}
        <div>
          <label className="label">
            {project.drawingPath ? "図面を差し替える" : "図面をアップロード"}
          </label>
          <input
            type="file"
            accept="application/pdf"
            className="input"
            disabled={uploading}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) uploadDrawing(f);
            }}
          />
          <p className="mt-1 text-xs text-gray-500">
            uploads/ にローカル保存されます（Git管理外）
          </p>
        </div>
      </div>
    </div>
  );
}
