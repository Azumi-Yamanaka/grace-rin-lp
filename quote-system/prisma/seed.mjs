// サンプルデータ投入スクリプト（npm run db:seed）
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // ---------- マスタ ----------
  const materials = [
    { code: "SUS304-3", name: "SUS304 板材 3mm", materialType: "SUS304", spec: "3mm", unitPrice: 800, unit: "kg" },
    { code: "SUS304-2", name: "SUS304 板材 2mm", materialType: "SUS304", spec: "2mm", unitPrice: 820, unit: "kg" },
    { code: "SPCC-1.6", name: "SPCC 板材 1.6mm", materialType: "SPCC", spec: "1.6mm", unitPrice: 250, unit: "kg" },
    { code: "A5052-3", name: "A5052 板材 3mm", materialType: "A5052", spec: "3mm", unitPrice: 900, unit: "kg" },
    { code: "SS400-6", name: "SS400 板材 6mm", materialType: "SS400", spec: "6mm", unitPrice: 220, unit: "kg" },
  ];
  for (const m of materials) {
    await prisma.materialMaster.upsert({ where: { code: m.code }, update: m, create: m });
  }

  const processes = [
    { code: "LASER", name: "レーザー加工", unitPrice: 500, chargeUnit: "分" },
    { code: "BEND", name: "曲げ加工", unitPrice: 300, chargeUnit: "回" },
    { code: "WELD", name: "溶接", unitPrice: 600, chargeUnit: "分" },
    { code: "TAP", name: "タップ加工", unitPrice: 100, chargeUnit: "箇所" },
    { code: "DEBURR", name: "バリ取り", unitPrice: 200, chargeUnit: "分" },
    { code: "INSPECT", name: "検査", unitPrice: 400, chargeUnit: "分" },
  ];
  for (const p of processes) {
    await prisma.processMaster.upsert({ where: { code: p.code }, update: p, create: p });
  }

  if ((await prisma.outsourceMaster.count()) === 0) {
    await prisma.outsourceMaster.createMany({
      data: [
        { processName: "電解研磨", supplier: "山田表面処理工業", basePrice: 3000, notes: "SUS製品のみ。納期3日" },
        { processName: "メッキ処理", supplier: "共栄メッキ", basePrice: 2500, notes: "亜鉛・ニッケル対応" },
        { processName: "粉体塗装", supplier: "青島塗装", basePrice: 4000, notes: "標準色は在庫あり" },
        { processName: "アルマイト", supplier: "共栄メッキ", basePrice: 3500, notes: "アルミのみ" },
      ],
    });
  }

  const parts = [
    { code: "NUT-M6", name: "圧入ナット M6", unitPrice: 25, supplier: "ミスミ" },
    { code: "NUT-M8", name: "圧入ナット M8", unitPrice: 35, supplier: "ミスミ" },
    { code: "HINGE-40", name: "ステンレス蝶番 40mm", unitPrice: 180, supplier: "モノタロウ" },
    { code: "HANDLE-A", name: "樹脂ハンドル A型", unitPrice: 320, supplier: "ミスミ" },
  ];
  for (const p of parts) {
    await prisma.purchasedPartMaster.upsert({ where: { code: p.code }, update: p, create: p });
  }

  // ---------- 過去案件サンプル（履歴・類似案件・ダッシュボード確認用） ----------
  const year = new Date().getFullYear();
  const existing = await prisma.project.count();
  if (existing > 0) {
    console.log("既に案件データが存在するためサンプル案件の投入をスキップしました");
    return;
  }

  const samples = [
    {
      id: `Q-${year}-0001`,
      name: "制御盤カバー製作",
      customerName: "株式会社東洋機械",
      assignee: "佐藤",
      quantity: 10,
      status: "受注",
      material: "SUS304",
      partNumber: "TYK-CV-210",
      cost: { material: 28000, process: 22000, purchased: 3000, outsource: 8000, other: 4000 },
      aiRate: 33, finalRate: 30, reason: "継続顧客のため基準より抑えた",
      orderResult: "受注", orderPriceRatio: 1.0,
      daysAgo: 40,
    },
    {
      id: `Q-${year}-0002`,
      name: "搬送装置ブラケット",
      customerName: "日新産業株式会社",
      assignee: "鈴木",
      quantity: 50,
      status: "受注",
      material: "SPCC",
      partNumber: "NS-BRK-05",
      cost: { material: 15000, process: 30000, purchased: 5000, outsource: 0, other: 3000 },
      aiRate: 28, finalRate: 28, reason: "推奨値のまま採用",
      orderResult: "受注", orderPriceRatio: 0.97,
      daysAgo: 25,
    },
    {
      id: `Q-${year}-0003`,
      name: "食品機械ホッパー",
      customerName: "株式会社東洋機械",
      assignee: "佐藤",
      quantity: 2,
      status: "失注",
      material: "SUS304",
      partNumber: "TYK-HP-011",
      cost: { material: 45000, process: 60000, purchased: 2000, outsource: 12000, other: 6000 },
      aiRate: 38, finalRate: 35, reason: "競合との相見積のため下げたが失注",
      orderResult: "失注", orderPriceRatio: null,
      daysAgo: 15,
    },
    {
      id: `Q-${year}-0004`,
      name: "点検口パネル",
      customerName: "丸紅エンジニアリング",
      assignee: "田中",
      quantity: 20,
      status: "見積提出済",
      material: "A5052",
      partNumber: "ME-PNL-33",
      cost: { material: 18000, process: 16000, purchased: 4000, outsource: 7000, other: 2000 },
      aiRate: 30, finalRate: 32, reason: "短納期対応のため上乗せ",
      orderResult: null, orderPriceRatio: null,
      daysAgo: 5,
    },
    {
      id: `Q-${year}-0005`,
      name: "架台フレーム",
      customerName: "日新産業株式会社",
      assignee: "鈴木",
      quantity: 4,
      status: "承認待ち",
      material: "SS400",
      partNumber: "NS-FRM-12",
      cost: { material: 32000, process: 40000, purchased: 0, outsource: 15000, other: 5000 },
      aiRate: 31, finalRate: 29, reason: "数量増の内示があるため調整",
      orderResult: null, orderPriceRatio: null,
      daysAgo: 2,
    },
  ];

  for (const s of samples) {
    const createdAt = new Date(Date.now() - s.daysAgo * 24 * 60 * 60 * 1000);
    const totalCost = Object.values(s.cost).reduce((a, b) => a + b, 0);
    const aiPrice = Math.ceil(totalCost / (1 - s.aiRate / 100));
    const finalPrice = Math.ceil(totalCost / (1 - s.finalRate / 100));

    const analysis = {
      partName: s.name,
      partNumber: s.partNumber,
      material: s.material,
      dimensions: "図面参照",
      thickness: "図面参照",
      quantity: String(s.quantity),
      weight: "要確認",
      machiningMethods: ["レーザー加工", "曲げ加工"],
      processSteps: ["レーザー切断", "曲げ", "検査"],
      surfaceTreatment: "なし",
      tolerance: "一般公差",
      purchasedParts: [],
      outsourcedProcesses: [],
      notes: "",
    };

    await prisma.project.create({
      data: {
        id: s.id,
        name: s.name,
        customerName: s.customerName,
        assignee: s.assignee,
        quantity: s.quantity,
        status: s.status,
        createdAt,
        analysis: {
          create: {
            provider: "mock",
            aiResultJson: JSON.stringify(analysis),
            editedJson: JSON.stringify(analysis),
            status: "確認済",
            confirmedBy: s.assignee,
            analyzedAt: createdAt,
          },
        },
        costItems: {
          create: [
            { category: "material", name: "材料費一式", quantity: 1, unitPrice: s.cost.material, amount: s.cost.material, sortOrder: 0 },
            { category: "process", name: "加工費一式", quantity: 1, unitPrice: s.cost.process, amount: s.cost.process, sortOrder: 1 },
            ...(s.cost.purchased > 0 ? [{ category: "purchased", name: "購入部品一式", quantity: 1, unitPrice: s.cost.purchased, amount: s.cost.purchased, sortOrder: 2 }] : []),
            ...(s.cost.outsource > 0 ? [{ category: "outsource", name: "外注費一式", quantity: 1, unitPrice: s.cost.outsource, amount: s.cost.outsource, sortOrder: 3 }] : []),
            { category: "other", name: "その他経費", quantity: 1, unitPrice: s.cost.other, amount: s.cost.other, sortOrder: 4 },
          ],
        },
        margin: {
          create: { baseRate: 25, smallLot: s.quantity <= 5 ? 3 : 0, shortDelivery: 0, specialProcess: 0, difficulty: 0, risk: 0, customerAdj: 0, salesAdj: 0, otherAdj: s.aiRate - 25 - (s.quantity <= 5 ? 3 : 0), otherReason: "サンプルデータ調整" },
        },
        decisions: {
          create: {
            aiRate: s.aiRate,
            aiPrice,
            finalRate: s.finalRate,
            finalPrice,
            rateDiff: s.finalRate - s.aiRate,
            priceDiff: finalPrice - aiPrice,
            reason: s.reason,
            decidedBy: s.assignee,
            decidedAt: createdAt,
          },
        },
        ...(s.orderResult
          ? {
              order: {
                create: {
                  result: s.orderResult,
                  orderPrice: s.orderPriceRatio ? Math.round(finalPrice * s.orderPriceRatio) : null,
                  decidedAt: new Date(createdAt.getTime() + 7 * 24 * 60 * 60 * 1000),
                },
              },
            }
          : {}),
      },
    });
  }

  console.log("サンプルデータの投入が完了しました");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
