"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AnalysisData,
  ProjectFull,
  ProviderInfo,
} from "@/lib/client-types";
import { dateTimeStr } from "@/lib/format";

const NEEDS_REVIEW = "要確認";

const TEXT_FIELDS: { key: keyof AnalysisData; label: string }[] = [
  { key: "partName", label: "部品名" },
  { key: "partNumber", label: "品番" },
  { key: "material", label: "材質" },
  { key: "dimensions", label: "寸法" },
  { key: "thickness", label: "板厚" },
  { key: "quantity", label: "数量" },
  { key: "weight", label: "重量" },
  { key: "surfaceTreatment", label: "表面処理" },
  { key: "tolerance", label: "公差" },
];

const LIST_FIELDS: { key: keyof AnalysisData; label: string }[] = [
  { key: "machiningMethods", label: "加工方法" },
  { key: "processSteps", label: "加工工程" },
  { key: "purchasedParts", label: "購入部品" },
  { key: "outsourcedProcesses", label: "外注工程" },
];

function parseAnalysis(
  analysis: ProjectFull["analysis"]
): AnalysisData | null {
  if (!analysis) return null;
  try {
    return JSON.parse(analysis.editedJson ?? analysis.aiResultJson);
  } catch {
    return null;
  }
}

export default function AnalysisTab({
  project,
  reload,
}: {
  project: ProjectFull;
  reload: () => Promise<void>;
}) {
  const [provider, setProvider] = useState<ProviderInfo | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmedBy, setConfirmedBy] = useState(project.assignee);

  const aiData: AnalysisData | null = useMemo(() => {
    if (!project.analysis) return null;
    try {
      return JSON.parse(project.analysis.aiResultJson);
    } catch {
      return null;
    }
  }, [project.analysis]);

  const [edited, setEdited] = useState<AnalysisData | null>(() =>
    parseAnalysis(project.analysis)
  );
  const [prevAnalysis, setPrevAnalysis] = useState(project.analysis);

  // 解析結果が更新されたら編集フォームを同期する（レンダー中の状態調整パターン）
  if (project.analysis !== prevAnalysis) {
    setPrevAnalysis(project.analysis);
    setEdited(parseAnalysis(project.analysis));
  }

  useEffect(() => {
    fetch("/api/provider")
      .then((r) => r.json())
      .then(setProvider)
      .catch(() => {});
  }, []);

  async function runAnalysis() {
    if (
      provider?.external &&
      !confirm(
        `図面PDFを外部AI（${provider.label}）に送信して解析します。よろしいですか？\n\n送信内容: ${provider.sends}`
      )
    )
      return;
    setRunning(true);
    setError(null);
    const res = await fetch(`/api/projects/${project.id}/analyze`, {
      method: "POST",
    });
    setRunning(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "解析に失敗しました");
    }
    await reload();
  }

  async function saveEdits() {
    if (!edited) return;
    setMessage(null);
    const res = await fetch(`/api/projects/${project.id}/analysis`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: edited, confirmedBy }),
    });
    if (res.ok) {
      setMessage("解析結果を保存しました（確認済）");
      await reload();
    } else {
      const data = await res.json().catch(() => ({}));
      setMessage(data.error ?? "保存に失敗しました");
    }
  }

  const setField = (key: keyof AnalysisData, value: string | string[]) =>
    setEdited((d) => (d ? { ...d, [key]: value } : d));

  return (
    <div className="max-w-4xl space-y-4">
      {/* 実行パネル: 送信先・送信内容を明示（ブラックボックス化回避） */}
      <div className="card">
        <div className="flex items-start justify-between gap-4">
          <div className="text-sm">
            <div className="font-semibold">AI図面解析</div>
            {provider && (
              <div className="mt-1 space-y-0.5 text-xs text-gray-600">
                <div>
                  解析エンジン: <span className="font-medium">{provider.label}</span>
                </div>
                <div>送信内容: {provider.sends}</div>
                {provider.external ? (
                  <div className="font-medium text-amber-700">
                    ⚠ 実行すると図面が外部APIに送信されます
                  </div>
                ) : (
                  <div className="text-emerald-700">外部送信はありません</div>
                )}
              </div>
            )}
            {project.analysis && (
              <div className="mt-1 text-xs text-gray-500">
                前回解析: {dateTimeStr(project.analysis.analyzedAt)}（
                {project.analysis.provider}）／ 状態: {project.analysis.status}
                {project.analysis.confirmedBy &&
                  ` ／ 確認者: ${project.analysis.confirmedBy}`}
              </div>
            )}
          </div>
          <button
            className="btn-primary shrink-0"
            onClick={runAnalysis}
            disabled={running || !project.drawingPath}
          >
            {running
              ? "解析中..."
              : project.analysis
                ? "再解析を実行"
                : "AI解析を実行"}
          </button>
        </div>
        {!project.drawingPath && (
          <p className="mt-2 text-xs text-rose-600">
            図面PDFが未アップロードです。「① 案件情報」タブからアップロードしてください。
          </p>
        )}
        {error && (
          <div className="mt-2 rounded border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </div>
        )}
      </div>

      {edited && (
        <div className="card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">
              解析結果の確認・修正
              <span className="ml-2 text-xs font-normal text-gray-500">
                「要確認」の項目は必ず確認してください。AI原文は各欄の下に表示されます。
              </span>
            </h2>
          </div>
          {message && (
            <div className="mb-3 rounded border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs text-blue-700">
              {message}
            </div>
          )}
          <div className="grid grid-cols-3 gap-3">
            {TEXT_FIELDS.map((f) => {
              const value = String(edited[f.key] ?? "");
              const aiValue = aiData ? String(aiData[f.key] ?? "") : "";
              const needsReview = value === NEEDS_REVIEW;
              return (
                <div key={f.key}>
                  <label className="label">
                    {f.label}
                    {needsReview && (
                      <span className="ml-1 rounded bg-amber-100 px-1 text-[10px] font-bold text-amber-700">
                        要確認
                      </span>
                    )}
                  </label>
                  <input
                    className={`input ${needsReview ? "border-amber-400 bg-amber-50" : ""}`}
                    value={value}
                    onChange={(e) => setField(f.key, e.target.value)}
                  />
                  <div className="mt-0.5 truncate text-[10px] text-gray-400">
                    AI: {aiValue || "−"}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {LIST_FIELDS.map((f) => {
              const arr = (edited[f.key] as string[]) ?? [];
              const aiArr = aiData ? ((aiData[f.key] as string[]) ?? []) : [];
              const needsReview = arr.includes(NEEDS_REVIEW);
              return (
                <div key={f.key}>
                  <label className="label">
                    {f.label}（1行に1項目）
                    {needsReview && (
                      <span className="ml-1 rounded bg-amber-100 px-1 text-[10px] font-bold text-amber-700">
                        要確認
                      </span>
                    )}
                  </label>
                  <textarea
                    rows={3}
                    className={`input ${needsReview ? "border-amber-400 bg-amber-50" : ""}`}
                    value={arr.join("\n")}
                    onChange={(e) =>
                      setField(
                        f.key,
                        e.target.value
                          .split("\n")
                          .map((s) => s.trim())
                          .filter(Boolean)
                      )
                    }
                  />
                  <div className="mt-0.5 truncate text-[10px] text-gray-400">
                    AI: {aiArr.join("、") || "−"}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-3">
            <label className="label">その他注意事項</label>
            <textarea
              rows={2}
              className="input"
              value={edited.notes}
              onChange={(e) => setField("notes", e.target.value)}
            />
            <div className="mt-0.5 truncate text-[10px] text-gray-400">
              AI: {aiData?.notes || "−"}
            </div>
          </div>
          <div className="mt-4 flex items-end justify-end gap-3">
            <div className="w-40">
              <label className="label">確認者</label>
              <input
                className="input"
                value={confirmedBy}
                onChange={(e) => setConfirmedBy(e.target.value)}
              />
            </div>
            <button className="btn-primary" onClick={saveEdits}>
              確認・修正を保存
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
