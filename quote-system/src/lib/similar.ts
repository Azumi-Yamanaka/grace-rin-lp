import { prisma } from "./db";

/**
 * 類似案件の抽出（MVP: 単純ルール。SPEC 仮定A7）
 * 同一顧客 / 材質一致 / 品番部分一致 のいずれかに該当する過去案件を返す。
 * 将来的にAIベースの類似検索（埋め込みベクトル等）に置き換える想定。
 */
export async function findSimilarProjects(projectId: string, limit = 5) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { analysis: true },
  });
  if (!project) return [];

  let material: string | undefined;
  let partNumber: string | undefined;
  if (project.analysis) {
    try {
      const data = JSON.parse(
        project.analysis.editedJson ?? project.analysis.aiResultJson
      );
      if (typeof data.material === "string" && data.material !== "要確認")
        material = data.material;
      if (typeof data.partNumber === "string" && data.partNumber !== "要確認")
        partNumber = data.partNumber;
    } catch {
      // 解析JSONが壊れている場合は顧客名のみで検索
    }
  }

  const orConditions: object[] = [{ customerName: project.customerName }];
  if (material)
    orConditions.push({ analysis: { editedJson: { contains: material } } });
  if (partNumber)
    orConditions.push({ analysis: { editedJson: { contains: partNumber } } });

  const candidates = await prisma.project.findMany({
    where: {
      id: { not: projectId },
      OR: orConditions,
      decisions: { some: {} }, // 価格決定まで進んだ案件のみ
    },
    include: {
      costItems: true,
      decisions: { orderBy: { decidedAt: "desc" }, take: 1 },
      order: true,
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return candidates.map((p) => {
    const cost = p.costItems.reduce((acc, i) => acc + i.amount, 0);
    const decision = p.decisions[0];
    return {
      id: p.id,
      name: p.name,
      customerName: p.customerName,
      assignee: p.assignee,
      pastCost: cost,
      pastPrice: decision?.finalPrice ?? null,
      marginRate: decision?.finalRate ?? null,
      orderPrice: p.order?.orderPrice ?? null,
      orderResult: p.order?.result ?? null,
      createdAt: p.createdAt,
    };
  });
}
