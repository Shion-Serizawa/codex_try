# デプロイ手順（Deno Deploy + Neon Postgres）

本プロジェクトは Deno Fresh + Postgres を使用しています。Deno Deploy ではTCP接続が使えないため、DBは HTTP/WebSocket 対応の Neon Serverless を利用します。ローカルは Docker で Postgres を起動します。

## 構成の要点
- ランタイム: Deno Deploy Early Access（通常のDeployでも可）
- DB（本番）: Neon Serverless Postgres（HTTP/WebSocket ドライバ）
- DB（開発）: Docker Postgres（TCPドライバ）
- リアルタイム: SSE（サーバ内メモリpub/sub）。複数インスタンス間の共有は未対応（後述）。
- 秘密情報: `NEON_DATABASE_URL`, `APP_SECRET`, （任意）`ADMIN_SECRET`

## 0. 事前準備
1) GitHub に本リポジトリをプッシュ
2) Neon にサインアップ（https://neon.tech/）
3) Deno Deploy にサインアップ（https://dash.deno.com/）

## 1. Neon でDBを用意
1) 新規プロジェクト + データベース作成
2) Connection string（接続文字列）を控えます。
   - 例: `postgresql://USER:PASS@ep-xxxx-xxxxx.ap-southeast-1.aws.neon.tech/DB?sslmode=require`
   - `sslmode=require` が付いていることを確認

## 2. 初回マイグレーション（Neonに対して実行）

### APP_SECRET の決め方（必須）
- 役割: 投稿表示に出す「ID風ハッシュ」を生成するためのシークレットです（スレID + 日付 + IP + APP_SECRET から短いIDを作成）。
- 要件: ランダムで長い値（少なくとも128bit、推奨256bit）。共通鍵なので漏えい厳禁。環境ごと（本番/開発）で別値にするのが無難です。
- 生成例:
  - OpenSSL（16進・推奨）: `openssl rand -hex 32`  → 64文字のhex（扱いやすく記号なし）
  - OpenSSL（Base64）: `openssl rand -base64 32`
  - Denoワンライナー（hex）:
    ```sh
    deno eval 'const b=new Uint8Array(32); crypto.getRandomValues(b); console.log(Array.from(b).map(x=>x.toString(16).padStart(2,"0")).join(""));'
    ```
- 取り扱い: `.env`（ローカル）や Deno Deploy の環境変数（本番）に設定し、Git管理しないこと。
- ローテーション: 変更すると当日以降の「ID風ハッシュ」が全て変わります（過去投稿の表示テキスト自体は変わりません）。必要な場合のみ計画的に行ってください。
ローカル端末から Neon に直接接続してマイグレーションを適用します。

```sh
# 例: シェル一発で実行（APP_SECRET は上記手順で生成した値を使用）
NEON_DATABASE_URL='<Neonの接続文字列>' APP_SECRET='<ランダム文字列>' \
  deno run -A scripts/migrate.ts up

# 初期データ（任意）
NEON_DATABASE_URL='<Neonの接続文字列>' APP_SECRET='<ランダム文字列>' \
  deno task seed
```

補足（.env と優先順位）
- スクリプトは `.env` をローカルで自動読み込みしますが、既にプロセス環境変数に設定されている値は上書きしません。
- 上記のようにコマンド前に `NEON_DATABASE_URL=... APP_SECRET=...` を付与した場合、.env よりも「コマンド先頭での指定」が優先されます。
- そのため、ローカルに `DATABASE_URL` が残っていても、`NEON_DATABASE_URL` を付けて実行すれば Neon に対して処理されます。

注意:
- マイグレーションは Deploy 上では実行しません（FS依存や運用の観点から）。
- 以降、スキーマが変わるたびに同様にローカルから Neon に対して `migrate.ts up` を実行してください。

## 3. Deno Deploy プロジェクト作成
1) Deno Deploy のダッシュボードで「New Project」→「GitHub」→ リポジトリ選択
2) エントリポイントに `main.ts` を指定（デフォルトブランチに合わせてください）
3) import map はリポジトリ直下の `import_map.json` が自動で使われます
4) 環境変数（Environment Variables）を設定
   - `NEON_DATABASE_URL`: Neon の接続文字列
   - `APP_SECRET`: ランダムな長い文字列（ID生成に利用）
   - 任意: `ADMIN_SECRET`（管理API用）、`RATELIMIT_POST_MS`（既定: 10000）、`RATELIMIT_THREAD_MS`（既定: 60000）
5) Deploy を実行

## 4. 動作確認
1) デプロイURLを開き、トップページ（Boards）が表示されることを確認
2) もしボードが無ければ、手順「2. 初回マイグレーション」の seed を実施済みか確認
3) ボードページ → スレ作成 → スレ内で投稿
   - 投稿直後にSSEで自動反映されます

## 5. リアルタイム（SSE）の注意
- 現状の実装は「サーバプロセス内のpub/sub」です。単一インスタンスでは問題ありませんが、複数インスタンスにスケールアウトした場合、インスタンス間でイベントは共有されません。
- スケール/グローバル配信を行うにはいずれかを追加実装してください。
  - Neon の LISTEN/NOTIFY を使うブリッジ（ドライバ制約の確認が必要）
  - Upstash/Redis HTTP Pub/Sub を使う共通ブローカー
  - 1インスタンス（リージョン固定）運用の明示（トラフィックが少ない間の割り切り）

## 6. よくあるトラブルと対処
- 500/JSONエラー（BigInt関連）
  - APIレスポンスは BigInt→文字列化のラッパーで返しているため最新のコードでは発生しません。古いデプロイなら再デプロイしてください。
- 「Set DATABASE_URL ...」
  - 本番は `NEON_DATABASE_URL` を設定してください（`DATABASE_URL` はローカル向け）。
- Boards が空
  - `deno task seed` を Neon に対して実行（手順2を参照）。
- 429（連投制限）
  - 既定では投稿10秒、スレ作成60秒のクールダウンです。環境変数で調整できます。

## 7. ディレクトリ・エントリの補足
- エントリ: `main.ts`
- Fresh マニフェスト: `fresh.gen.ts`（手動管理。新しい island/route を追加したらここに追記）
- import map: `import_map.json`
- マイグレーション: `db/migrations/*.sql`、ランナー `scripts/migrate.ts`
- 初期データ: `scripts/seed.ts`

## 8. 将来の拡張
- 管理APIの追加（スレのロック/スティッキーなど）
- XSS対策の強化と引用/アンカーの表示改善
- 共有Pub/Subの導入（Upstash/Redis など）でマルチインスタンス・マルチリージョンを安定化
