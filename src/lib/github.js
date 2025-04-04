import { Octokit } from '@octokit/rest';

// GitHub Actionsから環境変数を取得
const GITHUB_TOKEN = import.meta.env.GITHUB_TOKEN || process.env.GITHUB_TOKEN;
const REPO_OWNER = import.meta.env.REPO_OWNER || process.env.REPO_OWNER || 'nao-amj';
const REPO_NAME = import.meta.env.REPO_NAME || process.env.REPO_NAME || 'starlight-issue-wiki';

// Octokitクライアントを初期化
const octokit = new Octokit({
  auth: GITHUB_TOKEN
});

/**
 * GitHubからIssue一覧を取得する
 * @returns {Promise<Array>} Issueの配列
 */
export async function getIssues() {
  try {
    // 本番環境ではGitHub APIを使用
    if (GITHUB_TOKEN) {
      const { data } = await octokit.issues.listForRepo({
        owner: REPO_OWNER,
        repo: REPO_NAME,
        state: 'open',
        per_page: 100,
      });
      
      return data;
    } 
    // トークンがない場合はモックデータを返す
    else {
      return getMockIssues();
    }
  } catch (error) {
    console.error('Failed to fetch issues:', error);
    return getMockIssues();
  }
}

/**
 * 特定のIssueを番号で取得
 * @param {number} number Issue番号
 * @returns {Promise<Object|null>} Issue情報
 */
export async function getIssueByNumber(number) {
  try {
    if (GITHUB_TOKEN) {
      const { data } = await octokit.issues.get({
        owner: REPO_OWNER,
        repo: REPO_NAME,
        issue_number: number,
      });
      
      return data;
    } else {
      // モックデータから検索
      const mockIssues = getMockIssues();
      return mockIssues.find(issue => issue.number === Number(number)) || null;
    }
  } catch (error) {
    console.error(`Failed to fetch issue #${number}:`, error);
    // モックデータから検索
    const mockIssues = getMockIssues();
    return mockIssues.find(issue => issue.number === Number(number)) || null;
  }
}

/**
 * イシューのコメントを取得する
 * @param {number} issueNumber イシュー番号
 * @returns {Promise<Array>} コメントの配列
 */
export async function getIssueComments(issueNumber) {
  try {
    if (GITHUB_TOKEN) {
      const { data } = await octokit.issues.listComments({
        owner: REPO_OWNER,
        repo: REPO_NAME,
        issue_number: issueNumber,
      });
      
      return data;
    } else {
      // モックコメントを返す
      return getMockComments(issueNumber);
    }
  } catch (error) {
    console.error(`Failed to fetch comments for issue #${issueNumber}:`, error);
    return [];
  }
}

/**
 * タイトルからURLスラッグを生成
 * @param {string} title タイトル文字列
 * @returns {string} URLスラッグ
 */
export function generateSlug(title) {
  if (!title) return '';
  
  return title
    .toLowerCase()
    .replace(/[\s.,\/#!$%\^&\*;:{}=\-_`~()]/g, '-')
    .replace(/--+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * モックIssueデータを返す（開発用）
 * @returns {Array} モックIssueの配列
 */
function getMockIssues() {
  return [
    {
      number: 1,
      title: 'Starlight Issue Wikiへようこそ',
      body: '# Starlight Issue Wikiへようこそ\n\nこのWikiは、GitHubのIssueを使って管理するドキュメントサイトです。\n\n## 特徴\n\n- GitHubのIssueがそのままWikiページになります\n- Markdownで簡単に編集できます\n- 自動的にカテゴリ分けされます\n\n## 使い方\n\n1. GitHubでIssueを作成する\n2. ラベルでカテゴリを設定する\n3. 自動的にWikiに反映される\n\n詳しくは[はじめに](/wiki/welcome)をご覧ください。',
      html_url: 'https://github.com/nao-amj/starlight-issue-wiki/issues/1',
      created_at: '2025-03-01T00:00:00Z',
      updated_at: '2025-03-01T00:00:00Z',
      labels: [
        { name: 'documentation', color: '0075ca', description: 'ドキュメント関連' }
      ]
    },
    {
      number: 2,
      title: 'Markdownの使い方',
      body: '# Markdownの使い方\n\nこのWikiではMarkdownを使って文書を書くことができます。\n\n## 見出し\n\n見出しは`#`を使って表現します。\n\n## リスト\n\n- 箇条書き1\n- 箇条書き2\n\n順序付きリスト:\n\n1. 項目1\n2. 項目2',
      html_url: 'https://github.com/nao-amj/starlight-issue-wiki/issues/2',
      created_at: '2025-03-05T00:00:00Z',
      updated_at: '2025-03-06T00:00:00Z',
      labels: [
        { name: 'tutorial', color: 'd876e3', description: 'チュートリアル' },
        { name: 'wiki', color: '0e8a16', description: 'Wiki記事' }
      ]
    },
    {
      number: 3,
      title: 'GitHubの使い方',
      body: '# GitHubの使い方\n\n## アカウント作成\n\nGitHubアカウントを作成するには...\n\n## リポジトリの作成\n\n1. 右上の+ボタンをクリック\n2. New repositoryを選択\n3. ...',
      html_url: 'https://github.com/nao-amj/starlight-issue-wiki/issues/3',
      created_at: '2025-03-10T00:00:00Z',
      updated_at: '2025-03-10T00:00:00Z',
      labels: [
        { name: 'tutorial', color: 'd876e3', description: 'チュートリアル' }
      ]
    }
  ];
}

/**
 * モックコメントデータを返す（開発用）
 * @param {number} issueNumber イシュー番号
 * @returns {Array} モックコメントの配列
 */
function getMockComments(issueNumber) {
  // イシュー番号に基づいたモックコメントを返す
  const mockCommentSets = {
    1: [
      {
        id: 1001,
        body: 'この記事はとても役立ちました！',
        created_at: '2025-03-02T10:00:00Z',
        updated_at: '2025-03-02T10:00:00Z',
        user: {
          login: 'mock-user-1',
          avatar_url: 'https://avatars.githubusercontent.com/u/1?v=4'
        }
      }
    ],
    2: [
      {
        id: 2001,
        body: 'Markdownの表の書き方も追加してほしいです。',
        created_at: '2025-03-07T14:30:00Z',
        updated_at: '2025-03-07T14:30:00Z',
        user: {
          login: 'mock-user-2',
          avatar_url: 'https://avatars.githubusercontent.com/u/2?v=4'
        }
      },
      {
        id: 2002,
        body: '表の書き方は以下のようになります：\n\n```markdown\n| 列1 | 列2 | 列3 |\n| --- | --- | --- |\n| セル1 | セル2 | セル3 |\n| セル4 | セル5 | セル6 |\n```',
        created_at: '2025-03-08T09:15:00Z',
        updated_at: '2025-03-08T09:15:00Z',
        user: {
          login: 'mock-user-3',
          avatar_url: 'https://avatars.githubusercontent.com/u/3?v=4'
        }
      }
    ]
  };
  
  // イシュー番号に対応するコメントセットがあれば返す、なければ空配列
  return mockCommentSets[issueNumber] || [];
}
