# emoCraft

Slackで使用できるカスタム絵文字を簡単に作成できるWebアプリケーション。

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
npm run db:push
```

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

## プロジェクト構造

```
slack-emoji-generator/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes
│   │   ├── auth/          # Better Auth routes
│   │   └── trpc/          # tRPC routes
│   ├── globals.css        # グローバルスタイル
│   ├── layout.tsx         # ルートレイアウト
│   └── page.tsx          # ホームページ
├── components/            # Reactコンポーネント
│   └── ui/               # shadcn/uiコンポーネント
├── lib/                   # ユーティリティ
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

