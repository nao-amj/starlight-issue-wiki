# GitWiki Hub

GitHubのissueを動的に取得してWikiとして表示するモダンなWebアプリケーション。

https://nao-amj.github.io/starlight-issue-wiki/

## 特徴

- Astroを使用したモダンな静的サイト
- GitHubのissueからコンテンツを動的に取得
- GitHub Actionsによる自動デプロイ
- カテゴリー別のページ一覧表示
- ラベルによるカテゴリー分類
- レスポンシブデザイン
- 検索機能（キーボードナビゲーション対応）
- タイムラインビュー
- **ダークモード/ライトモード切り替え対応**
- **高機能なシンタックスハイライト**
- **Mermaidによるグラフプレビュー**
- **Markdownテーブルの完全サポート**
- **モバイル最適化**
- Zettelkastenモード（設定切り替え可能）

## 最近の更新

### 1. Wiki詳細ページの機能強化
- **Mermaidによるグラフ描画**: ```mermaid コードブロックによる図表の描画をサポート
- **GitHubスタイルMarkdown**: GitHub Flavored Markdownの完全対応
- **テーブル表示の改善**: レスポンシブ対応と見やすさの向上
- **シンタックスハイライト強化**: 多言語対応と色彩豊かなハイライト

### 2. テーマ切り替え機能の強化
- ヘッダーにテーマ切り替えボタンを追加
- ユーザー設定の記憶機能
- システム設定に自動追従するオプション

詳しい更新内容は [CHANGES.md](CHANGES.md) をご覧ください。

## 実装の詳細

### データフロー

1. GitHub Actionsのワークフロー (`update-issues.yml`) が定期的に実行され、issueの内容を取得
2. ビルド時にGitHub APIからissueデータを読み込み、Wikiページを生成
3. ラベルをカテゴリーとして利用し、カテゴリー別にissueを整理

### ページ構成

- **トップページ**: 概要とカテゴリー別のissue一覧を表示
- **Wikiページ**: 各issueの内容をMarkdownからHTMLに変換して表示
- **ページ一覧**: すべてのissueをカテゴリーごとに整理して表示
- **検索機能**: コンテンツ全文を検索して関連ページを素早く見つける

### 技術スタック

- **Astro**: 静的サイトジェネレーターとして利用
- **marked**: MarkdownをHTMLに変換するために使用
- **GitHub Actions**: 自動デプロイとデータ更新
- **date-fns**: 日付フォーマット用ライブラリ
- **shiki**: コードハイライト
- **mermaid**: 図表描画ライブラリ
- **marked-gfm-heading-id**: GitHubスタイルの見出しID生成

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

### Markdown 高度な機能

#### コードブロック

```
​```javascript
// シンタックスハイライト付きのコード
const example = "Hello World";
console.log(example);
​```
```

#### テーブル

```
| 項目 | 説明 |
|------|------|
| 例1  | 説明1 |
| 例2  | 説明2 |
```

#### Mermaidグラフ

```
​```mermaid
graph TD
    A[開始] --> B{条件}
    B -->|Yes| C[処理1]
    B -->|No| D[処理2]
    C --> E[終了]
    D --> E
​```
```

## Zettelkastenモード

Zettelkastenモードは、Wikiをナレッジベースとして使うための機能です。このモードでは以下の機能が有効になります：

### Zettelkastenモードの機能

- **自動キーワードリンク**: 他のページのタイトルやラベルと一致するキーワードを自動的にリンクします
- **Wiki形式のリンク**: `[[ページタイトル]]` の形式でページ間リンクを作成できます
- **双方向リンクのハイライト**: 相互にリンクしているページ間のリンクを特別な色で強調表示します
- **バックリンク表示**: 現在のページにリンクしている他のページのリストを表示します

### Zettelkastenモードの有効化

1. 右下の歯車アイコンをクリックして設定パネルを開きます
2. 「Zettelkastenモードを有効にする」をオンにします
3. 必要に応じて他の設定も調整します
4. 「設定を保存」をクリックします

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
