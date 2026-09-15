# 物件概要書ジェネレーター（bukken-app）

物件情報をフォームに入力すると、じゅうばん集計と同じフォーマットの「物件概要書」を
その場で画面表示・印刷／PDF保存できるツールです。複数物件を保存して一覧管理できます。

- フロントエンド: React + Vite（`src/`）
- バックエンド: PHP 単一ファイル `server/api.php`（トークン認証＋楽観ロック、データは JSON ファイル保存）
- デプロイ: GitHub Actions → Xserver への FTP デプロイ（`juban-app` と同じ方式）

## ローカルで動かす

```bash
npm install
cp .env.example .env            # VITE_API_TOKEN を適当な値に変更
cp server/config.example.php server/config.php   # API_TOKEN を .env と同じ値に変更

# ターミナル1: PHPサーバー
php -S localhost:8787 -t server

# ターミナル2: フロント（/api.php は自動的に localhost:8787 にプロキシされます）
npm run dev
```

`http://localhost:5173` を開くと使えます。

## 本番環境（kit.tokyo サブドメイン）を用意する手順

この一式は用意できていますが、以下はご本人のアカウント操作が必要なため、
Claude 側では代行できません。順番に進めていただければ、そのあとのデプロイは
GitHub Actions が自動で行います。

### 1. サブドメインを作成する（Xserverサーバーパネル）

juban.kit.tokyo と同じ要領で、新しいサブドメイン（例: `bukken.kit.tokyo` や
`gaiyousho.kit.tokyo` など）を Xserver サーバーパネルの「サブドメイン設定」から
作成してください。ドキュメントルート（公開フォルダ）が新しく発行されます。

### 2. GitHubリポジトリを作成する

`suzuki322/bukken-app`（名前は任意）などの名前で新しい空リポジトリを作成し、
このプロジェクト一式を push してください。このセッションで作業を進める場合は、
Fine-grained Personal Access Token（対象リポジトリのみ・Contents: Read and write、
Actions: Read and write 程度の権限）を発行して共有いただければ、こちらで
初回 push とワークフロー設置まで行えます（purchase-data-pipeline と同じ運用で、
作業後は revoke していただいて構いません）。

### 3. GitHub Secretsを設定する

リポジトリの Settings → Secrets and variables → Actions で、以下を登録してください。

| Secret名 | 内容 |
|---|---|
| `FTP_SERVER` | Xserverの FTPホスト名（サーバーパネルで確認） |
| `FTP_USERNAME` | 1で作成したサブドメイン用（またはサーバー共通）のFTPアカウント |
| `FTP_PASSWORD` | 上記のFTPパスワード |
| `FTP_SERVER_DIR` | 1で発行されたドキュメントルートへのパス（例: `/bukken.kit.tokyo/public_html/`） |
| `VITE_API_TOKEN` | `server/config.php` の `API_TOKEN` と同じ、十分に長いランダムな文字列 |

### 4. `server/config.php` をサーバーに直接設置する

`server/config.example.php` をコピーして `API_TOKEN` を上のSecretと同じ値にし、
FTPクライアント等でサーバーの公開フォルダに直接アップロードしてください
（このファイルは GitHub Actions のデプロイでは上書きされないよう除外設定して
あるので、最初の一度だけ手動で置けば大丈夫です）。

### 5. mainブランチにpushする

ここまで終われば、`main` ブランチへの push（または Actions タブからの
手動実行）で自動ビルド・自動デプロイされます。以降はデータ入力・修正のたびに
コードを触る必要はありません（データは物件を保存するたびにサーバー上の
`data/properties.json` に蓄積されます）。

## データの扱いについて

- 認証はURLを知っている人向けの簡易トークン方式です（ログイン画面はありません）。
  価格や現況など社外非公開の情報を含むため、URLの共有範囲にはご注意ください。
- データはサーバー上の `server/data/properties.json` 1ファイルに保存されます。
  バックアップを取りたい場合は、このファイルを定期的にダウンロードしてください。
