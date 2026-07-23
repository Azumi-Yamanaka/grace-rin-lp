import { getProviderInfo } from "@/lib/ai/provider";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  const info = getProviderInfo();

  return (
    <div className="max-w-2xl">
      <h1 className="mb-4 text-lg font-bold">設定</h1>

      <div className="card">
        <h2 className="mb-3 text-sm font-semibold">AI プロバイダ</h2>
        <table className="table-base">
          <tbody>
            <tr>
              <td className="w-40 bg-gray-50 text-xs font-semibold text-gray-600">
                現在のプロバイダ
              </td>
              <td>{info.label}</td>
            </tr>
            <tr>
              <td className="bg-gray-50 text-xs font-semibold text-gray-600">
                外部送信
              </td>
              <td>
                {info.external ? (
                  <span className="font-medium text-amber-700">
                    あり（外部AI APIに送信されます）
                  </span>
                ) : (
                  <span className="font-medium text-emerald-700">
                    なし（ローカルで完結）
                  </span>
                )}
              </td>
            </tr>
            <tr>
              <td className="bg-gray-50 text-xs font-semibold text-gray-600">
                送信されるデータ
              </td>
              <td>{info.sends}</td>
            </tr>
          </tbody>
        </table>
        <p className="mt-3 text-xs text-gray-500">
          プロバイダの切り替えは <code className="rounded bg-gray-100 px-1">.env</code>{" "}
          で行います（GEMINI_API_KEY / OPENAI_API_KEY / AI_PROVIDER）。API
          キーはサーバ側でのみ使用され、画面・ログには出力されません。
        </p>
      </div>

      <div className="card mt-4">
        <h2 className="mb-3 text-sm font-semibold">セキュリティ方針</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-gray-700">
          <li>図面PDFはローカルの uploads/ に保存され、Git 管理外です</li>
          <li>外部AIへ送信するのは図面PDF・案件名・数量のみ（顧客名・金額は送信しません）</li>
          <li>ログには図面の内容・APIキーを出力しません</li>
          <li>AI解析の実行前に、送信先と送信内容が画面に表示されます</li>
        </ul>
      </div>
    </div>
  );
}
