import Link from "next/link";
import { prisma } from "@/lib/db";
import { yen, pct, dateStr } from "@/lib/format";
import StatusBadge from "@/components/status-badge";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [monthProjects, monthDecisions, pendingCount, recent] =
    await Promise.all([
      prisma.project.findMany({
        where: { createdAt: { gte: monthStart } },
        include: { order: true },
      }),
      prisma.priceDecision.findMany({
        where: { decidedAt: { gte: monthStart } },
        orderBy: { decidedAt: "desc" },
      }),
      prisma.project.count({ where: { status: "承認待ち" } }),
      prisma.project.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        include: { decisions: { orderBy: { decidedAt: "desc" }, take: 1 } },
      }),
    ]);

  // 案件ごとの最新決定のみ集計
  const latestByProject = new Map<string, (typeof monthDecisions)[number]>();
  for (const d of monthDecisions) {
    if (!latestByProject.has(d.projectId)) latestByProject.set(d.projectId, d);
  }
  const decisions = [...latestByProject.values()];
  const quoteTotal = decisions.reduce((a, d) => a + d.finalPrice, 0);
  const avgMargin =
    decisions.length > 0
      ? decisions.reduce((a, d) => a + d.finalRate, 0) / decisions.length
      : null;

  const won = monthProjects.filter((p) => p.order?.result === "受注").length;
  const lost = monthProjects.filter((p) => p.order?.result === "失注").length;
  const winRate = won + lost > 0 ? (won / (won + lost)) * 100 : null;

  const stats = [
    { label: "今月の見積件数", value: `${monthProjects.length}件` },
    { label: "見積総額", value: yen(quoteTotal) },
    { label: "受注件数", value: `${won}件` },
    { label: "受注率", value: winRate === null ? "−" : pct(winRate) },
    { label: "平均粗利率", value: avgMargin === null ? "−" : pct(avgMargin) },
    { label: "承認待ち件数", value: `${pendingCount}件` },
  ];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-bold">ダッシュボード</h1>
        <Link href="/projects/new" className="btn-primary">
          ＋ 新規見積
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-3 xl:grid-cols-6">
        {stats.map((s) => (
          <div key={s.label} className="card">
            <div className="text-xs text-gray-500">{s.label}</div>
            <div className="tabular mt-1 text-xl font-bold">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="card mt-4 p-0">
        <div className="border-b border-gray-200 px-4 py-3 text-sm font-semibold">
          最近の案件
        </div>
        <table className="table-base">
          <thead>
            <tr>
              <th>案件ID</th>
              <th>案件名</th>
              <th>顧客</th>
              <th>担当</th>
              <th className="text-right">見積価格</th>
              <th>ステータス</th>
              <th>登録日</th>
            </tr>
          </thead>
          <tbody>
            {recent.map((p) => (
              <tr key={p.id} className="hover:bg-blue-50">
                <td>
                  <Link
                    href={`/projects/${p.id}`}
                    className="font-medium text-blue-700 hover:underline"
                  >
                    {p.id}
                  </Link>
                </td>
                <td>{p.name}</td>
                <td>{p.customerName}</td>
                <td>{p.assignee}</td>
                <td className="tabular text-right">
                  {yen(p.decisions[0]?.finalPrice ?? null)}
                </td>
                <td>
                  <StatusBadge status={p.status} />
                </td>
                <td>{dateStr(p.createdAt)}</td>
              </tr>
            ))}
            {recent.length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-gray-400">
                  案件がありません。「新規見積」から登録してください。
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
