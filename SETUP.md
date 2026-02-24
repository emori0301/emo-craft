# セットアップガイド

## Docker Desktopのインストール（macOS）

### 1. Docker Desktopをダウンロード

1. [Docker Desktop for Mac](https://www.docker.com/products/docker-desktop/)にアクセス
2. お使いのMacのチップ（IntelまたはApple Silicon）に合わせてダウンロード
3. `.dmg`ファイルを開いてインストール

### 2. Docker Desktopを起動

1. アプリケーションフォルダからDocker Desktopを起動
2. 初回起動時は設定を確認して「完了」をクリック
3. メニューバーにDockerアイコンが表示されれば起動成功

### 3. 動作確認

ターミナルで以下のコマンドを実行：

```bash
docker --version
docker compose version
```

両方のコマンドがバージョン情報を表示すればOKです。

## Dockerなしで開発する場合

Docker Desktopをインストールしたくない場合は、ローカルにPostgreSQLをインストールできます。

### PostgreSQLのインストール（Homebrew）

```bash
brew install postgresql@16
brew services start postgresql@16
```

### データベースの作成

```bash
createdb slack_emoji_generator
```

### 環境変数の設定

`.env`ファイルの`DATABASE_URL`を以下のように変更：

```
DATABASE_URL="postgresql://[ユーザー名]:[パスワード]@localhost:5432/slack_emoji_generator?schema=public"
```

デフォルトのPostgreSQLユーザー名は、macOSのユーザー名と同じです。パスワードが設定されていない場合は、パスワード部分を空にできます。

