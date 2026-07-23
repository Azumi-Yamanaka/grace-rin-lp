"use client";

import { useCallback, useEffect, useState } from "react";
import { ProjectFull } from "@/lib/client-types";
import StatusBadge from "@/components/status-badge";
import InfoTab from "./info-tab";
import AnalysisTab from "./analysis-tab";
import CostTab from "./cost-tab";
import PricingTab from "./pricing-tab";
import ReviewTab from "./review-tab";

const TABS = [
  { key: "info", label: "① 案件情報" },
  { key: "analysis", label: "② 図面解析" },
  { key: "cost", label: "③ 原価計算" },
  { key: "pricing", label: "④ 価格提案" },
  { key: "review", label: "⑤ 見積確認" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function ProjectWorkspace({ projectId }: { projectId: string }) {
  const [project, setProject] = useState<ProjectFull | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [tab, setTab] = useState<TabKey>("info");

  const reload = useCallback(async () => {
    const res = await fetch(`/api/projects/${projectId}`);
    if (!res.ok) {
      setNotFound(true);
      return;
    }
    setProject(await res.json());
  }, [projectId]);

  useEffect(() => {
    fetch(`/api/projects/${projectId}`).then(async (res) => {
      if (!res.ok) setNotFound(true);
      else setProject(await res.json());
    });
  }, [projectId]);

  if (notFound)
    return <div className="text-gray-500">案件が見つかりません。</div>;
  if (!project) return <div className="text-gray-400">読み込み中...</div>;

  return (
    <div>
      <div className="mb-3 flex items-center gap-3">
        <h1 className="text-lg font-bold">
          <span className="tabular mr-2 text-gray-500">{project.id}</span>
          {project.name}
        </h1>
        <StatusBadge status={project.status} />
        <span className="text-sm text-gray-500">
          {project.customerName} ／ 担当: {project.assignee}
        </span>
      </div>

      <div className="mb-4 flex border-b border-gray-300">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${
              tab === t.key
                ? "border-blue-700 text-blue-700"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "info" && <InfoTab project={project} reload={reload} />}
      {tab === "analysis" && <AnalysisTab project={project} reload={reload} />}
      {tab === "cost" && <CostTab project={project} reload={reload} />}
      {tab === "pricing" && <PricingTab project={project} reload={reload} />}
      {tab === "review" && <ReviewTab project={project} reload={reload} />}
    </div>
  );
}
