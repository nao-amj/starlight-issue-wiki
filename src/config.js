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
  { title: 'データ管理', url: '/data-management' },
  { title: 'GitHub', url: REPO_URL, external: true }
];

// 拡張Zettelkasten設定
export const DEFAULT_ZETTELKASTEN_CONFIG = {
  enabled: true,
  autoLinkKeywords: true,
  highlightBidirectional: true,
  showBacklinks: true,
  keywordMinLength: 3,
  // 拡張機能
  visualMode: 'standard', // standard, atomic, hierarchical
  markdownLinks: true,     // [[page]] 形式リンクの自動変換
  contextAwareness: true,  // セマンティック関連コンテンツ表示
  atomicNoteSize: 'medium', // small, medium, large
  autoSuggestLinks: true,  // 関連リンク自動提案
  tagHierarchy: true,      // タグの階層構造
  smartBacklinks: true,    // バックリンクのコンテキスト表示
  graphVisualization: true // 関連グラフ視覚化
};

// データ管理機能のアクセスポイント
export const DATA_MANAGEMENT = {
  path: '/data-management',
  features: [
    {
      name: 'データエクスポート',
      description: 'Wikiコンテンツを様々な形式でエクスポート'
    },
    {
      name: 'データインポート',
      description: '外部からWikiにデータをインポート'
    },
    {
      name: 'レポート生成',
      description: 'Wikiのコンテンツやアクティビティに関するレポートを生成'
    },
    {
      name: 'バックアップと同期',
      description: 'Wikiデータのバックアップと外部サービスとの同期'
    }
  ]
};
