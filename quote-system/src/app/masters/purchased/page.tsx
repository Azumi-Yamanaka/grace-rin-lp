import MasterTable from "@/components/master-table";

export default function PurchasedPage() {
  return (
    <div>
      <h1 className="mb-4 text-lg font-bold">購入部品マスタ</h1>
      <MasterTable
        type="purchased"
        columns={[
          { key: "code", label: "部品コード", required: true, placeholder: "NUT-M6" },
          { key: "name", label: "部品名", required: true, placeholder: "圧入ナット M6" },
          { key: "unitPrice", label: "仕入単価(円)", type: "number", required: true },
          { key: "supplier", label: "仕入先", placeholder: "ミスミ" },
        ]}
      />
    </div>
  );
}
