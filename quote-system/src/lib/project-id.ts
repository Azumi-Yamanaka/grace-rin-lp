import { prisma } from "./db";

/**
 * 案件IDを発行する: Q-西暦-連番4桁（例 Q-2026-0001）。
 * 年ごとに連番リセット（SPEC 仮定A1）。
 */
export async function generateProjectId(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `Q-${year}-`;
  const last = await prisma.project.findFirst({
    where: { id: { startsWith: prefix } },
    orderBy: { id: "desc" },
    select: { id: true },
  });
  const next = last ? parseInt(last.id.slice(prefix.length), 10) + 1 : 1;
  return `${prefix}${String(next).padStart(4, "0")}`;
}
