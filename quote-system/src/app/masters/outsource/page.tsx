import MasterTable from "@/components/master-table";

export default function OutsourcePage() {
  return (
    <div>
      <h1 className="mb-4 text-lg font-bold">外注マスタ</h1>
      <MasterTable
        type="outsource"
        columns={[
          { key: "processName", label: "外注工程名", required: true, placeholder: "電解研磨" },
          { key: "supplier", label: "外注先", required: true, placeholder: "〇〇表面処理工業" },
          { key: "basePrice", label: "基準単価(円)", type: "number", required: true },
          { key: "notes", label: "備考", placeholder: "納期・条件など" },
        ]}
      />
    </div>
  );
}
