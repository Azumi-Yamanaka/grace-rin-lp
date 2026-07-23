import MasterTable from "@/components/master-table";

export default function ProcessesPage() {
  return (
    <div>
      <h1 className="mb-4 text-lg font-bold">加工マスタ</h1>
      <MasterTable
        type="processes"
        columns={[
          { key: "code", label: "加工コード", required: true, placeholder: "LASER" },
          { key: "name", label: "加工名", required: true, placeholder: "レーザー加工" },
          { key: "unitPrice", label: "単価(円)", type: "number", required: true },
          { key: "chargeUnit", label: "課金単位", required: true, placeholder: "分 / 回 / 箇所" },
        ]}
      />
    </div>
  );
}
