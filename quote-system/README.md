# 見積半自動化システム（MVP）

製造業の見積作成業務を半自動化する社内向け Web アプリです。
**「AI が見積案を作成し、人間が確認・修正・承認する」** Human-in-the-loop 設計を採用しています。

設計の詳細・DB設計・仮定事項は [SPEC.md](./SPEC.md) を参照してください。

## 主な機能

- 案件登録（案件ID自動発行 `Q-YYYY-NNNN`）＋図面PDFアップロード
- 図面のAI解析（Gemini / OpenAI / Mock を切替可能。結果は必ず人間が編集）
- 原価マスタ管理（材料 / 加工 / 購入部品 / 外注）
- 原価計算（プログラムロジック。手動修正は理由付きで履歴保存）
- 粗利提案（基準粗利率＋加算項目 → 推奨売価。自動確定しない）
- 担当者決定の記録（AI推奨値と最終値の差分・理由を保存 = 経験値のデータ化）
- 過去見積検索・類似案件表示
- ステータス管理・ダッシュボード

## 技術構成

- Next.js (App Router) / TypeScript / Tailwind CSS
- SQLite + Prisma
- AI 抽象化層（`src/lib/ai/`）: MockProvider / GeminiProvider / OpenAIProvider

## セットアップ

```bash
cd quote-system
npm install

# 環境変数（APIキーが無くても Mock で動作します）
cp .env.example .env

# DB 初期化 + サンプルデータ投入
npm run db:setup

# 起動
npm run dev
```

http://localhost:3000 を開いてください。

## AI プロバイダの切り替え

`.env` に API キーを設定すると自動で切り替わります（未設定なら MockProvider）。

```bash
# Gemini を使う場合
GEMINI_API_KEY=xxxx

# OpenAI を使う場合
OPENAI_API_KEY=xxxx

# 明示的に指定する場合
AI_PROVIDER=mock   # mock / gemini / openai
```

外部 API 呼び出しは `src/lib/ai/` 配下に限定されており、送信内容は解析実行前に画面で確認できます。図面の内容・API キーはログに出力しません。

## スクリプト

| コマンド | 説明 |
|---|---|
| `npm run dev` | 開発サーバ起動 |
| `npm run build` | 本番ビルド |
| `npm run db:setup` | スキーマ反映＋サンプルデータ投入 |
| `npm run db:push` | Prisma スキーマを DB に反映 |
| `npm run db:seed` | サンプルデータ投入 |

## ディレクトリ構成

```
quote-system/
├── prisma/            スキーマ・シード
├── uploads/           図面PDF保存先（Git管理外）
├── src/
│   ├── app/           画面・API ルート
│   ├── components/    UI コンポーネント
│   └── lib/           計算ロジック・AI抽象化層・DB
├── SPEC.md            要件・設計・仮定事項
└── README.md
```
