import { BASE_PATH } from '../config';
import staticIssues from '../data/issues.json';
import { GitHubIssue } from '../data/types';

// キャッシュオブジェクト
const cache: { 
  issues?: GitHubIssue[],
  timestamp?: number,
  singleIssues: { [key: number]: { issue: GitHubIssue, timestamp: number } }
} = {
  singleIssues: {}
};

// キャッシュの有効期限（5分）
const CACHE_TTL = 5 * 60 * 1000;

// サーバーAPIを使ってIssueを取得する関数
export async function getIssues(): Promise<GitHubIssue[]> {
  try {
    // キャッシュが有効な場合はキャッシュを返す
    if (cache.issues && cache.timestamp && (Date.now() - cache.timestamp < CACHE_TTL)) {
      console.log('Using cached issues');
      return cache.issues;
    }

    console.log('Using static JSON data for issues');
    
    // 静的JSONファイルから読み込む
    const issues = staticIssues as GitHubIssue[];
    
    // キャッシュを更新
    cache.issues = issues;
    cache.timestamp = Date.now();
    
    return issues;
  } catch (error) {
    console.error('Error fetching issues:', error);
    // 静的データにフォールバック
    return staticIssues as GitHubIssue[];
  }
}

// 特定のIssueを取得する関数
export async function getIssue(issueNumber: number): Promise<GitHubIssue | null> {
  try {
    // キャッシュをチェック
    const cachedIssue = cache.singleIssues[issueNumber];
    if (cachedIssue && (Date.now() - cachedIssue.timestamp < CACHE_TTL)) {
      return cachedIssue.issue;
    }
    
    console.log(`Fetching issue #${issueNumber} from static data`);
    
    // 静的JSONから該当するissueを検索
    const issue = (staticIssues as GitHubIssue[]).find(i => i.number === issueNumber);
    
    if (!issue) {
      console.warn(`Issue #${issueNumber} not found in static data`);
      return null;
    }
    
    // キャッシュを更新
    cache.singleIssues[issueNumber] = {
      issue,
      timestamp: Date.now()
    };
    
    return issue;
  } catch (error) {
    console.error(`Error fetching issue #${issueNumber}:`, error);
    // 静的データから再検索
    const staticIssue = (staticIssues as GitHubIssue[]).find(i => i.number === issueNumber);
    return staticIssue || null;
  }
}

// スラッグから対応するIssueを検索する関数
export function findIssueBySlug(issues: GitHubIssue[], slug: string): GitHubIssue | undefined {
  return issues.find(issue => {
    const issueSlug = generateSlug(issue.title);
    return issueSlug === slug;
  });
}

// スラッグを生成する関数（改良版）
export function generateSlug(title: string): string {
  // このタイトルを持つIssueを検索
  const matchingIssue = (staticIssues as GitHubIssue[]).find(issue => issue.title === title);
  const issueNumber = matchingIssue?.number;
  
  // タイトルに日本語が含まれるか、または空のスラッグになる場合
  if (/[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf\u3400-\u4dbf]/.test(title) || 
      title.replace(/[^\w\s-]/g, '').trim() === '') {
    // 基本スラッグを生成（日本語文字を保持）
    let baseSlug = title
      .toLowerCase()
      .replace(/[^\w\s\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf\u3400-\u4dbf-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/^-+|-+$/g, '');
      
    // 空のスラッグになる場合は、"issue"という文字を追加
    if (baseSlug === '') {
      baseSlug = 'issue';
    }
    
    // issueの番号がわかる場合は、それを含めたスラッグを生成
    return issueNumber ? `${baseSlug}-${issueNumber}` : baseSlug;
  }
  
  // 英数字のみのタイトルの場合は従来の処理
  const standardSlug = title.toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/^-+|-+$/g, '');
  
  // issueの番号がわかる場合は、それを含めたスラッグを生成（ただし元のスラッグが十分に一意な場合は不要）
  if (issueNumber && standardSlug.length < 5) {
    return `${standardSlug}-${issueNumber}`;
  }
  
  return standardSlug;
}