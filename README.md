# GitWiki Hub (Zettelkasten)

GitHubのissueを動的に取得してWiki（Zettelkasten）として表示するモダンなWebアプリケーション。

https://nao-amj.github.io/starlight-issue-wiki/

## 特徴

- Astroを使用したモダンな静的サイト
- GitHubのissueからコンテンツを動的に取得
- GitHub Actionsによる自動デプロイ
- カテゴリー別のページ一覧表示
- ラベルによるカテゴリー分類
- レスポンシブデザイン
- 検索機能
- タイムラインビュー
- ダークモード対応

## Zettelkasten機能

このブランチでは、以下のZettelkasten機能を追加しています：

### 1. 双方向リンク
- `[[ノート名]]` 構文でノート間のリンクを作成可能
- リンクは自動的に正しいURLに変換
- 存在しないノートへのリンクは新規作成を促す表示に

### 2. バックリンク
- 各ノートの下部に、そのノートを参照している他のノートのリストを表示
- バックリンクの文脈（リンクを含む文章）も表示

### 3. タグ機能
- ノート内で `#タグ名` または GitHubのラベルでタグ付け可能
- タグクラウド表示でタグの重要性を視覚化
- タグでの絞り込み機能

### 4. グラフビュー
- ノート間の関連性をグラフで視覚化
- ノードのクリックで対応するノートにジャンプ
- ズーム、パン、フィルタリング機能
- 専用のグラフページでより詳細な関連性を表示

### 5. ノートメタデータ
- 各ノートの作成日・更新日を表示
- ノート固有のID表示
- 参照情報の可視化

## 実装の詳細

### データフロー

1. GitHub Actionsのワークフロー (`update-issues.yml`) が定期的に実行され、issueの内容を取得
2. ビルド時にGitHub APIからissueデータを読み込み、Wikiページを生成
3. Zettelkasten処理（リンク解析、バックリンク生成、タグ抽出など）
4. レンダリングとインタラクション機能の適用

### ページ構成

- **トップページ**: 概要とカテゴリー別のissue一覧を表示
- **Wikiページ**: 各issueの内容をMarkdownからHTMLに変換して表示、バックリンクやグラフも表示
- **ページ一覧**: すべてのissueをカテゴリーごとに整理して表示
- **グラフページ**: 知識ベース全体の関連性を視覚的に表示
- **検索機能**: コンテンツ全文を検索して関連ページを素早く見つける

### 技術スタック

- **Astro**: 静的サイトジェネレーターとして利用
- **marked**: MarkdownをHTMLに変換するために使用
- **GitHub Actions**: 自動デプロイとデータ更新
- **date-fns**: 日付フォーマット用ライブラリ
- **shiki**: コードハイライト
- **vis-network**: グラフ可視化ライブラリ

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
5. ノート内で `[[他のノートのタイトル]]` と記述すると、そのノートへのリンクが作成されます
6. `#タグ名` でタグ付けすることができます

## フォールバック機能

ビルドプロセスが失敗した場合に備えて、基本的なフォールバック用のindex.htmlを用意しています。これにより、常にサイトがアクセス可能な状態を維持します。

## 設定とセキュリティ

リポジトリの情報は `src/config.ts` ファイルに定義されており、ビルド時に静的に組み込まれます：

```typescript
// GitHub リポジトリの情報
export const REPO_OWNER = 'nao-amj';
export const REPO_NAME = 'starlight-issue-wiki';
export const REPO_URL = `https://github.com/${REPO_OWNER}/${REPO_NAME}`;

// サイト情報
export const SITE_TITLE = 'GitWiki Hub';
export const SITE_DESCRIPTION = 'GitHubのissueを使って管理するスマートなWikiプラットフォーム';
```

GitHub Actionsで実行される場合、`GITHUB_TOKEN` は自動的に提供され、クライアントサイドではなくワークフローの中でのみ使用されます。このアプローチにより、トークンがクライアントに公開されるリスクを排除しています。

## GitHub Pagesでのデプロイ

このリポジトリはGitHub Pagesでデプロイするように設定されています。設定方法は以下の通りです：

1. リポジトリの「Settings」タブを開く
2. 左側のサイドバーから「Pages」を選択
3. 「Source」セクションで「GitHub Actions」を選択

これにより、`.github/workflows/deploy.yml`で定義したワークフローに従って自動的にサイトがデプロイされます。
