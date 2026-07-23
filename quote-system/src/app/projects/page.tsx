import Link from "next/link";
import { prisma } from "@/lib/db";
import { STATUSES } from "@/lib/status";
import { yen, dateStr } from "@/lib/format";
import StatusBadge from "@/components/status-badge";

export const dynamic = "force-dynamic";

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const projects = await prisma.project.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: "desc" },
    include: {
      decisions: { orderBy: { decidedAt: "desc" }, take: 1 },
      costItems: { select: { amount: true } },
    },
  });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-bold">案件一覧</h1>
        <Link href="/projects/new" className="btn-primary">
          ＋ 新規見積
        </Link>
      </div>

      <div className="mb-3 flex flex-wrap gap-1">
        <Link
          href="/projects"
          className={`rounded border px-2.5 py-1 text-xs ${
            !status
              ? "border-blue-700 bg-blue-700 text-white"
              : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
          }`}
        >
          すべて
        </Link>
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={`/projects?status=${encodeURIComponent(s)}`}
            className={`rounded border px-2.5 py-1 text-xs ${
              status === s
                ? "border-blue-700 bg-blue-700 text-white"
                : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            {s}
          </Link>
        ))}
      </div>

      <div className="card p-0">
        <table className="table-base">
          <thead>
            <tr>
              <th>案件ID</th>
              <th>案件名</th>
              <th>顧客</th>
              <th>担当</th>
              <th className="text-right">数量</th>
              <th className="text-right">原価</th>
              <th className="text-right">見積価格</th>
              <th>納期</th>
              <th>ステータス</th>
              <th>登録日</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => {
              const cost = p.costItems.reduce((a, i) => a + i.amount, 0);
              return (
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
                  <td className="tabular text-right">{p.quantity}</td>
                  <td className="tabular text-right">
                    {cost > 0 ? yen(cost) : "−"}
                  </td>
                  <td className="tabular text-right">
                    {yen(p.decisions[0]?.finalPrice ?? null)}
                  </td>
                  <td>{dateStr(p.dueDate)}</td>
                  <td>
                    <StatusBadge status={p.status} />
                  </td>
                  <td>{dateStr(p.createdAt)}</td>
                </tr>
              );
            })}
            {projects.length === 0 && (
              <tr>
                <td colSpan={10} className="py-8 text-center text-gray-400">
                  該当する案件がありません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
