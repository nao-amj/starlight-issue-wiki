/**
 * サイト全体の設定ファイル
 */

// ベースパス (GitHub Pagesのリポジトリ名に合わせる)
export const BASE_PATH = '/starlight-issue-wiki';

// APIのベースURL (開発環境と本番環境で分岐)
export const API_BASE_URL = import.meta.env.DEV
  ? '/api' // 開発環境
  : `${BASE_PATH}/api`; // 本番環境

// GitHub リポジトリの情報
export const REPO_OWNER = 'nao-amj';
export const REPO_NAME = 'starlight-issue-wiki';
export const REPO_URL = `https://github.com/${REPO_OWNER}/${REPO_NAME}`;

// サイト情報
export const SITE_TITLE = 'GitWiki Hub';
export const SITE_DESCRIPTION = 'GitHubのissueを使って管理するスマートなWikiプラットフォーム';

// Zettelkasten設定
export interface ZettelkastenConfig {
  enabled: boolean;        // Zettelkastenモードを有効化するかどうか
  autoLinkKeywords: boolean;  // キーワードを自動的にリンクするかどうか
  highlightBidirectional: boolean; // 双方向リンクを強調表示するかどうか
  showBacklinks: boolean;  // バックリンク一覧を表示するかどうか
  keywordMinLength: number; // 自動リンクする最小キーワード長
}

// デフォルトのZettelkasten設定
export const DEFAULT_ZETTELKASTEN_CONFIG: ZettelkastenConfig = {
  enabled: true,             // デフォルトで有効に変更
  autoLinkKeywords: true,
  highlightBidirectional: true,
  showBacklinks: true,
  keywordMinLength: 3
};
