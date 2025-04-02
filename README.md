# Starlight Issue Wiki

GitHubのissueを動的に取得してWikiとして表示するStarlightサイト。

## 特徴

- Astro + Starlightを使用したモダンな静的サイト
- GitHubのissueからコンテンツを動的に取得
- GitHub Actionsによる自動デプロイ
- カテゴリー別のページ一覧表示
- ラベルによるカテゴリー分類

## 実装の詳細

### データフロー

1. GitHub Actionsのワークフロー (`update-issues.yml`) が定期的に実行され、issueの内容を `src/data/issues.json` として保存
2. ビルド時に静的JSONファイルからissueデータを読み込み、Wikiページを生成
3. ラベルをカテゴリーとして利用し、カテゴリー別にissueを整理

### ページ構成

- **トップページ**: 概要とカテゴリー別のissue一覧を表示
- **Wikiページ**: 各issueの内容をMarkdownからHTMLに変換して表示
- **ページ一覧**: すべてのissueをカテゴリーごとに整理して表示

### 技術スタック

- **Astro**: 静的サイトジェネレーターとして利用
- **marked**: MarkdownをHTMLに変換するために使用
- **GitHub Actions**: 自動デプロイとデータ更新

## 開発方法

```bash
# 依存関係のインストール
npm install

# 開発サーバーの起動
npm run dev

# ビルド
npm run build
```

## 使い方

1. 新しいコンテンツを追加したい場合は、GitHubで新しいissueを作成します
2. issueのタイトルは、ページのタイトルになります
3. issueの本文は、ページの内容になります（Markdownをサポート）
4. 「documentation」や「wiki」などのラベルを付けると、カテゴリー分けされます

## フォールバック機能

ビルドプロセスが失敗した場合に備えて、基本的なフォールバック用のindex.htmlを用意しています。これにより、常にサイトがアクセス可能な状態を維持します。

## 環境変数

- `GITHUB_TOKEN`: GitHub APIのアクセストークン（GitHub Actionsで自動設定）
- `REPO_OWNER`: リポジトリのオーナー名 (デフォルト: "nao-amj")
- `REPO_NAME`: リポジトリ名 (デフォルト: "starlight-issue-wiki")

これらの環境変数は、GitHub Actionsのシークレットとして設定することも、`.env`ファイルに記述することもできます。

## GitHub Pagesでのデプロイ

このリポジトリはGitHub Pagesでデプロイするように設定されています。設定方法は以下の通りです：

1. リポジトリの「Settings」タブを開く
2. 左側のサイドバーから「Pages」を選択
3. 「Source」セクションで「GitHub Actions」を選択

これにより、`.github/workflows/deploy.yml`で定義したワークフローに従って自動的にサイトがデプロイされます。
