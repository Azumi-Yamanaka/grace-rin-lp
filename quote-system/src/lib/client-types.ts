// クライアント側で扱う API レスポンスの型（日付は文字列で受け取る）

export interface AnalysisData {
  partName: string;
  partNumber: string;
  material: string;
  dimensions: string;
  thickness: string;
  quantity: string;
  weight: string;
  machiningMethods: string[];
  processSteps: string[];
  surfaceTreatment: string;
  tolerance: string;
  purchasedParts: string[];
  outsourcedProcesses: string[];
  notes: string;
}

export interface AnalysisRow {
  id: number;
  provider: string;
  aiResultJson: string;
  editedJson: string | null;
  status: string;
  analyzedAt: string;
  confirmedBy: string | null;
  confirmedAt: string | null;
}

export interface CostItemRow {
  id?: number;
  category: string;
  code: string | null;
  name: string;
  quantity: number;
  unit: string | null;
  unitPrice: number;
  amount: number;
  source: string;
  sortOrder: number;
}

export interface CostLogRow {
  id: number;
  itemName: string;
  field: string;
  beforeValue: string;
  afterValue: string;
  reason: string;
  editedBy: string;
  createdAt: string;
}

export interface MarginRow {
  baseRate: number;
  smallLot: number;
  shortDelivery: number;
  specialProcess: number;
  difficulty: number;
  risk: number;
  customerAdj: number;
  salesAdj: number;
  otherAdj: number;
  otherReason: string | null;
}

export interface DecisionRow {
  id: number;
  aiRate: number;
  aiPrice: number;
  finalRate: number;
  finalPrice: number;
  rateDiff: number;
  priceDiff: number;
  reason: string;
  decidedBy: string;
  decidedAt: string;
}

export interface OrderRow {
  result: string;
  orderPrice: number | null;
  note: string | null;
  decidedAt: string;
}

export interface ProjectFull {
  id: string;
  name: string;
  customerName: string;
  assignee: string;
  dueDate: string | null;
  quantity: number;
  notes: string | null;
  status: string;
  drawingPath: string | null;
  drawingName: string | null;
  createdAt: string;
  updatedAt: string;
  analysis: AnalysisRow | null;
  costItems: CostItemRow[];
  costLogs: CostLogRow[];
  margin: MarginRow | null;
  decisions: DecisionRow[];
  order: OrderRow | null;
}

export interface SimilarProject {
  id: string;
  name: string;
  customerName: string;
  assignee: string;
  pastCost: number;
  pastPrice: number | null;
  marginRate: number | null;
  orderPrice: number | null;
  orderResult: string | null;
  createdAt: string;
}

export interface ProviderInfo {
  name: string;
  label: string;
  external: boolean;
  sends: string;
}
