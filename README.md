# emoCraft

Slackで使用できるカスタム絵文字を簡単に作成できるWebアプリケーション。

## 主な機能

- **テキスト・画像エディター**: 16 種類の日本語フォント、単色 / グラデーション文字、16 種類のアニメーション（GIF 書き出し）
- **画像アップロード**: 好きな画像を最大 6 枚まで重ねられる（ファイル選択・ドラッグ&ドロップ・貼り付けに対応）
  - プレビュー上でドラッグして移動、右下のハンドルで拡大・回転
  - スマホは 2 本指ピンチで拡大・回転、PC はホイール / Shift+ホイールでも操作可能
  - 文字の前 / 後ろの切り替え、左右反転、不透明度、重なり順の変更
  - 文字もドラッグで移動・拡大・回転できる
- **ドット絵エディター**: ペン・塗りつぶし・図形・フレームアニメーション、画像をドット絵に変換して取り込み
- **モバイル対応**: スマホではプレビューを上部に固定し、設定をタブで切り替え。タッチ操作・safe-area に対応
- **保存・共有**: Google ログインでマイ絵文字に保存、公開ギャラリーでシェア

## 技術スタック

- **フロントエンド**: Next.js 15+ (App Router)
- **バックエンド**: Next.js API Routes + tRPC
- **データベース**: PostgreSQL (Prisma ORM)
- **認証**: Better Auth
- **UIコンポーネント**: shadcn/ui
- **スタイリング**: Tailwind CSS
- **型安全性**: TypeScript + Zod

## セットアップ

### 必要な環境

- Node.js 20+
- Docker Desktop (macOSの場合) または Docker & Docker Compose
- npm または yarn

**Docker Desktopのインストール方法（macOS）:**
1. [Docker Desktop for Mac](https://www.docker.com/products/docker-desktop/)をダウンロード
2. インストール後、Docker Desktopを起動
3. ターミナルで`docker --version`を実行して確認

**注意**: Docker Desktopがインストールされている場合、`docker-compose`ではなく`docker compose`（ハイフンなし）を使用してください。

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env`ファイルを`.env.example`を参考に作成してください。

```bash
cp .env.example .env
```

必要に応じて環境変数を編集してください。

**Googleログインの設定（「アクセスをブロック: このアプリのリクエストは無効です」エラーが出る場合）:**

1. [Google Cloud Console](https://console.cloud.google.com/) でプロジェクトを開く
2. 「APIとサービス」→「認証情報」→ OAuth 2.0 クライアント ID を選択
3. 「承認済みのリダイレクト URI」に以下を追加（使用するURLに合わせて）:
   - `http://127.0.0.1:3000/api/auth/callback/google`
   - `http://localhost:3000/api/auth/callback/google`
4. 「APIとサービス」→「OAuth 同意画面」を開く
5. **公開ステータスが「テスト」の場合**: 「テストユーザー」にログインで使用するGoogleアカウントのメールを追加
6. アプリを再起動して再度ログインを試す

### 3. DockerでPostgreSQLを起動

**Docker Desktopを使用する場合:**
```bash
docker compose up -d
```

**注意**: `docker`コマンドがPATHにない場合は、フルパスを使用してください：
```bash
/Applications/Docker.app/Contents/Resources/bin/docker compose up -d
```

**Dockerなしで開発する場合:**
ローカルにPostgreSQLをインストールし、`.env`ファイルの`DATABASE_URL`をローカルのPostgreSQL接続文字列に変更してください。

### 4. Prismaマイグレーション

```bash
npm run db:generate
npx prisma migrate deploy
```

スキーマ変更は `prisma/migrations/` のマイグレーションで管理しています。
開発中にスキーマを変更したら `npm run db:migrate`（`prisma migrate dev`）で新しいマイグレーションを作成してください。
本番環境へは `npx prisma migrate deploy` で適用します（`db:push` は使わないこと）。

### 5. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開いてください。

## スクリプト

- `npm run dev` - 開発サーバーを起動
- `npm run build` - プロダクションビルド
- `npm run start` - プロダクションサーバーを起動
- `npm run lint` - Biomeでリント
- `npm run format` - Biomeでフォーマット
- `npm run db:generate` - Prisma Clientを生成
- `npm run db:push` - スキーマをデータベースにプッシュ
- `npm run db:migrate` - マイグレーションを実行
- `npm run db:studio` - Prisma Studioを起動
- `npm test` - ユニットテスト（Vitest）を実行

## プロジェクト構造

```
emoCraft/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes
│   │   ├── auth/          # Better Auth routes
│   │   └── trpc/          # tRPC routes
│   ├── globals.css        # グローバルスタイル
│   ├── layout.tsx         # ルートレイアウト
│   └── page.tsx          # ホームページ
├── components/            # Reactコンポーネント
│   ├── editor/           # エディター（テキスト・画像 / ドット絵）
│   └── ui/               # shadcn/uiコンポーネント
├── hooks/                 # カスタムフック（保存フロー・キャンバス操作）
├── lib/                   # ユーティリティ
│   ├── editor/           # 描画・レイヤー計算・画像読み込み・GIF 生成
│   ├── auth/             # Better Auth設定
│   ├── prisma.ts         # Prisma Client
│   ├── trpc/             # tRPC設定
│   └── utils.ts          # ユーティリティ関数
├── server/                # サーバーサイドコード
│   └── api/               # APIルーター
│       ├── routers/       # tRPCルーター
│       └── trpc.ts        # tRPC設定
├── prisma/                # Prisma設定
│   └── schema.prisma     # データベーススキーマ
├── docker-compose.yml     # Docker Compose設定
├── Dockerfile            # Dockerイメージ設定
└── package.json          # 依存関係

```

## 開発

### shadcn/uiコンポーネントの追加

```bash
npx shadcn@latest add [component-name]
```

### Prismaスキーマの変更

1. `prisma/schema.prisma`を編集
2. `npm run db:push`でデータベースに反映

### tRPCルーターの追加

1. `server/api/routers/`に新しいルーターファイルを作成
2. `server/api/routers/_app.ts`にルーターを追加

## ライセンス

ISC

