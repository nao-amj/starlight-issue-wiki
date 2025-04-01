# Starlight Issue Wiki

GitHubのissueを動的に取得してWikiとして表示するStarlightサイト。

## 特徴

- Astro + Starlightを使用したモダンな静的サイト
- GitHubのissueからコンテンツを動的に取得
- GitHub Actionsによる自動デプロイ

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

issueにラベルを付けることで、カテゴリ分けすることもできます。

## 環境変数

- `GITHUB_TOKEN`: GitHub APIのアクセストークン（オプション）
- `REPO_OWNER`: リポジトリのオーナー名
- `REPO_NAME`: リポジトリ名

これらの環境変数は、GitHub Actionsのシークレットとして設定することも、`.env`ファイルに記述することもできます。