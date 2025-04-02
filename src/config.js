// サイトの設定

// リポジトリのオーナーとリポジトリ名
export const REPO_OWNER = 'nao-amj';
export const REPO_NAME = 'starlight-issue-wiki';

// サイトのベースパス（GitHub Pagesのパス）
export const BASE_PATH = '/starlight-issue-wiki';

// サイトのタイトルと説明
export const SITE_TITLE = 'Starlight Issue Wiki';
export const SITE_DESCRIPTION = 'GitHubのIssueを使って管理するドキュメントサイト';

// GitHub リポジトリURL
export const REPO_URL = `https://github.com/${REPO_OWNER}/${REPO_NAME}`;

// 日付フォーマット（日本語）
export const DATE_FORMATTER = new Intl.DateTimeFormat('ja-JP', {
  year: 'numeric',
  month: 'long',
  day: 'numeric'
});

// カテゴリーの設定（ラベルとその表示名、色）
export const CATEGORIES = {
  documentation: {
    label: 'ドキュメント',
    color: '#0075ca'
  },
  tutorial: {
    label: 'チュートリアル',
    color: '#d876e3'
  },
  wiki: {
    label: 'Wiki',
    color: '#0e8a16'
  }
};

// ナビゲーションリンク
export const NAV_LINKS = [
  { title: 'ホーム', url: '/' },
  { title: 'ページ一覧', url: '/wiki/index' },
  { title: 'はじめに', url: '/wiki/welcome' },
  { title: 'GitHub', url: REPO_URL, external: true }
];
