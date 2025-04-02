import type { IssueData, CategoryInfo, IssueDataResult } from '../types/github';

/**
 * 静的JSONファイルからIssueデータを読み込む
 */
export async function getIssuesData(): Promise<IssueDataResult> {
  // 開発環境ではモックデータを使用
  if (import.meta.env.DEV) {
    return mockIssuesData();
  }

  try {
    // 静的生成された JSON ファイルを読み込む
    const response = await fetch('/starlight-issue-wiki/data/issues.json');
    if (!response.ok) {
      throw new Error(`Failed to fetch issues: ${response.status} ${response.statusText}`);
    }
    
    const issues: IssueData[] = await response.json();
    const categories = extractCategories(issues);
    
    return { issues, categories };
  } catch (error) {
    console.error('Error loading issues:', error);
    // エラー時は空のデータを返す
    return { issues: [], categories: [] };
  }
}

/**
 * 指定されたIssue番号からIssueデータを取得
 */
export async function getIssueByNumber(issueNumber: number): Promise<IssueData | null> {
  const { issues } = await getIssuesData();
  return issues.find(issue => issue.number === issueNumber) || null;
}

/**
 * 指定されたカテゴリーに属するIssueを取得
 */
export async function getIssuesByCategory(category: string): Promise<IssueData[]> {
  const { issues } = await getIssuesData();
  
  return issues.filter(issue => 
    issue.labels.some(label => 
      label.name.toLowerCase() === category.toLowerCase()
    )
  );
}

/**
 * Issueからカテゴリー情報を抽出
 */
export function extractCategories(issues: IssueData[]): CategoryInfo[] {
  const categoriesMap = new Map<string, CategoryInfo>();
  
  // すべてのIssueからラベル情報を集計
  issues.forEach(issue => {
    issue.labels.forEach(label => {
      const id = label.name.toLowerCase();
      
      if (categoriesMap.has(id)) {
        const category = categoriesMap.get(id)!;
        category.count += 1;
      } else {
        categoriesMap.set(id, {
          id,
          name: label.name,
          description: label.description || undefined,
          count: 1,
          color: label.color,
        });
      }
    });
  });
  
  return Array.from(categoriesMap.values());
}

/**
 * 開発用モックデータ
 */
function mockIssuesData(): IssueDataResult {
  const mockIssues: IssueData[] = [
    {
      number: 1,
      title: 'サンプルドキュメント',
      body: '# サンプルドキュメント\n\nこれはサンプルドキュメントの内容です。\n\n## セクション1\n\nサンプルテキスト...',
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

  const mockCategories = extractCategories(mockIssues);
  
  return {
    issues: mockIssues,
    categories: mockCategories
  };
}

/**
 * Issueの本文をHTMLに変換するためのユーティリティ
 */
export function convertMarkdownToHtml(markdown: string): string {
  // マークダウンのレンダリングはクライアントサイドまたは
  // Astroコンポーネント内で行う方が良いため、ここでは単純に返す
  return markdown;
}

/**
 * スラグを生成
 */
export function generateSlug(issue: IssueData): string {
  // Issue番号をURLに含める (例: "3-github-の使い方")
  return `${issue.number}-${issue.title.toLowerCase()
    .replace(/[^\w\s\-]/g, '') // 英数字、スペース、ハイフン以外を削除
    .replace(/\s+/g, '-') // スペースをハイフンに変換
    .replace(/\-+/g, '-')}` // 連続するハイフンを単一のハイフンに変換
}
