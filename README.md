# 注意
- あくまでこれはCodexのお試しでDeno Deploy EAで使えるまでもっていったものです．
- 問題点が以下のようにあるので，デプロイ(公開)自体は中止しています．
  - 全部SSRなので，サイトがもっさりしている
  - SQLインジェクションとかが可能など，セキュリティ問題あり．
# プロジェクト: 2ch風BBS（Deno Fresh + Postgres）

概要
- フロントエンド: Fresh（SSR + islands、Twindデフォルト）
- バックエンド: Fresh の API ルート。コード構成でフロントとバックを分離、ミドルウェアでレート制限
- DB: Postgres（ローカルは Docker、Deploy は Neon Serverless）
- リアルタイム: SSE（サーバ内pub/sub。将来、共有Pub/Subに差し替え可能）

ローカル開発
- `.env.example` を `.env` にコピー（ローカルでは自動で読み込まれます）
- DB 起動: `docker compose up -d`
- マイグレーション: `deno task migrate:up`
- （任意）初期データ投入: `deno task seed`
- 開発サーバ: `deno task start` → http://localhost:8000/

主なコマンド
- `deno task migrate:up` / `deno task migrate:down` — スキーマ適用/リバート
- `deno task seed` — 初期の板データ投入（Boards追加UIは削除済みのため、最初はこれを推奨）
- `deno task start` — Fresh アプリ起動

ディレクトリ
- `routes/` — ページとAPI
- `islands/` — クライアント挙動（例: `ThreadClient`）
- `backend/` — DBクライアント/サービス/リアルタイム等のサーバロジック
- `db/migrations/` — SQLマイグレーション
- `scripts/` — migrate/seed スクリプト
- `import_map.json` — 依存マッピング（Fresh, Preact, Twind, Neon など）

デプロイ
- Deno Deploy + Neon Serverless を想定。詳細手順は `doc/deploy.md` を参照してください。

注意事項
- マイグレーションは Deploy 上では実行しません。ローカルから Neon に向けて `scripts/migrate.ts up` を実行してください。
- 現状のリアルタイムはサーバ内pub/subです。複数インスタンス配信は未対応（必要に応じて Upstash/Redis や Neon LISTEN/NOTIFY を導入）。
