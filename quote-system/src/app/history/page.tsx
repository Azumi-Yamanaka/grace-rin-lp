import Link from "next/link";
import { prisma } from "@/lib/db";
import { yen, pct, dateStr } from "@/lib/format";
import StatusBadge from "@/components/status-badge";

export const dynamic = "force-dynamic";

interface SearchParams {
  customer?: string;
  material?: string;
  method?: string;
  qtyMin?: string;
  qtyMax?: string;
  priceMin?: string;
  priceMax?: string;
  dateFrom?: string;
  dateTo?: string;
  partNumber?: string;
  keyword?: string;
}

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;

  const where: Record<string, unknown>[] = [];
  if (sp.customer) where.push({ customerName: { contains: sp.customer } });
  if (sp.material)
    where.push({ analysis: { editedJson: { contains: sp.material } } });
  if (sp.method)
    where.push({ analysis: { editedJson: { contains: sp.method } } });
  if (sp.partNumber)
    where.push({ analysis: { editedJson: { contains: sp.partNumber } } });
  if (sp.qtyMin) where.push({ quantity: { gte: parseInt(sp.qtyMin, 10) || 0 } });
  if (sp.qtyMax)
    where.push({ quantity: { lte: parseInt(sp.qtyMax, 10) || 999999999 } });
  if (sp.dateFrom) where.push({ createdAt: { gte: new Date(sp.dateFrom) } });
  if (sp.dateTo)
    where.push({
      createdAt: { lte: new Date(`${sp.dateTo}T23:59:59`) },
    });
  if (sp.keyword)
    where.push({
      OR: [
        { name: { contains: sp.keyword } },
        { customerName: { contains: sp.keyword } },
        { notes: { contains: sp.keyword } },
        { analysis: { editedJson: { contains: sp.keyword } } },
      ],
    });

  let projects = await prisma.project.findMany({
    where: where.length > 0 ? { AND: where } : undefined,
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      costItems: { select: { amount: true } },
      decisions: { orderBy: { decidedAt: "desc" }, take: 1 },
      order: true,
    },
  });

  // 金額（最終見積価格）での絞り込みは取得後にフィルタ
  const priceMin = sp.priceMin ? parseInt(sp.priceMin, 10) : null;
  const priceMax = sp.priceMax ? parseInt(sp.priceMax, 10) : null;
  if (priceMin !== null || priceMax !== null) {
    projects = projects.filter((p) => {
      const price = p.decisions[0]?.finalPrice;
      if (price === undefined) return false;
      if (priceMin !== null && price < priceMin) return false;
      if (priceMax !== null && price > priceMax) return false;
      return true;
    });
  }

  const fields: { name: keyof SearchParams; label: string; type?: string }[] = [
    { name: "customer", label: "顧客" },
    { name: "material", label: "材質" },
    { name: "method", label: "加工方法" },
    { name: "partNumber", label: "品番" },
    { name: "qtyMin", label: "数量(以上)", type: "number" },
    { name: "qtyMax", label: "数量(以下)", type: "number" },
    { name: "priceMin", label: "金額(以上)", type: "number" },
    { name: "priceMax", label: "金額(以下)", type: "number" },
    { name: "dateFrom", label: "日付(から)", type: "date" },
    { name: "dateTo", label: "日付(まで)", type: "date" },
    { name: "keyword", label: "キーワード" },
  ];

  return (
    <div>
      <h1 className="mb-4 text-lg font-bold">過去見積検索</h1>

      <form method="GET" className="card mb-4">
        <div className="grid grid-cols-4 gap-3 xl:grid-cols-6">
          {fields.map((f) => (
            <div key={f.name}>
              <label className="label">{f.label}</label>
              <input
                name={f.name}
                type={f.type ?? "text"}
                defaultValue={sp[f.name] ?? ""}
                className="input"
              />
            </div>
          ))}
          <div className="flex items-end gap-2">
            <button type="submit" className="btn-primary">
              検索
            </button>
            <Link href="/history" className="btn-secondary">
              クリア
            </Link>
          </div>
        </div>
      </form>

      <div className="card p-0">
        <div className="border-b border-gray-200 px-4 py-2 text-xs text-gray-500">
          {projects.length}件
        </div>
        <table className="table-base">
          <thead>
            <tr>
              <th>案件ID</th>
              <th>案件名</th>
              <th>顧客</th>
              <th>担当</th>
              <th className="text-right">数量</th>
              <th className="text-right">過去原価</th>
              <th className="text-right">見積価格</th>
              <th className="text-right">粗利率</th>
              <th className="text-right">受注価格</th>
              <th>結果</th>
              <th>日付</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => {
              const cost = p.costItems.reduce((a, i) => a + i.amount, 0);
              const d = p.decisions[0];
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
                    {yen(d?.finalPrice ?? null)}
                  </td>
                  <td className="tabular text-right">
                    {d ? pct(d.finalRate) : "−"}
                  </td>
                  <td className="tabular text-right">
                    {yen(p.order?.orderPrice ?? null)}
                  </td>
                  <td>
                    <StatusBadge status={p.status} />
                  </td>
                  <td>{dateStr(p.createdAt)}</td>
                </tr>
              );
            })}
            {projects.length === 0 && (
              <tr>
                <td colSpan={11} className="py-8 text-center text-gray-400">
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
