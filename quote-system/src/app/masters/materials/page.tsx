import MasterTable from "@/components/master-table";

export default function MaterialsPage() {
  return (
    <div>
      <h1 className="mb-4 text-lg font-bold">材料マスタ</h1>
      <MasterTable
        type="materials"
        columns={[
          { key: "code", label: "材料コード", required: true, placeholder: "SUS304-3" },
          { key: "name", label: "材料名", required: true, placeholder: "SUS304 板材 3mm" },
          { key: "materialType", label: "材質", required: true, placeholder: "SUS304" },
          { key: "spec", label: "規格", placeholder: "3mm" },
          { key: "unitPrice", label: "単価(円)", type: "number", required: true },
          { key: "unit", label: "単位", required: true, placeholder: "kg" },
        ]}
      />
    </div>
  );
}
