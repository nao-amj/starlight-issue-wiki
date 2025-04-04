import { BASE_PATH } from '../config';
import staticIssues from '../data/issues.json';
import { GitHubIssue } from '../data/types';

// キャッシュオブジェクト
const cache: { 
  issues?: GitHubIssue[],
  timestamp?: number,
  singleIssues: { [key: number]: { issue: GitHubIssue, timestamp: number } },
  comments: { [key: number]: { data: any[], timestamp: number } }
} = {
  singleIssues: {},
  comments: {}
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

    console.log('Fetching issues from GitHub API');
    
    // GitHub APIから直接取得を試みる（OPEN状態のIssueのみ）
    const response = await fetch('https://api.github.com/repos/nao-amj/starlight-issue-wiki/issues?state=open&per_page=100');
    
    if (!response.ok) {
      throw new Error(`GitHub API Error: ${response.status}`);
    }
    
    // レスポンスをJSONとしてパース
    const data = await response.json();
    
    // プルリクエストを除外
    const issues = data.filter((issue: any) => !issue.pull_request) as GitHubIssue[];
    console.log(`Fetched ${issues.length} issues from GitHub API`);
    
    // キャッシュを更新
    cache.issues = issues;
    cache.timestamp = Date.now();
    
    return issues;
  } catch (error) {
    console.error('Error fetching issues:', error);
    // 静的データにフォールバック
    const staticData = staticIssues as GitHubIssue[];
    // 静的データからOpen状態のIssueのみをフィルタリング
    return staticData.filter(issue => issue.state === 'open');
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
    
    // 全issueを取得してから目的のものを検索
    const allIssues = await getIssues();
    const issue = allIssues.find(i => i.number === issueNumber);
    
    if (!issue) {
      console.warn(`Issue #${issueNumber} not found in issues list, checking API directly`);
      
      // 直接そのIssueをAPIから取得
      try {
        const response = await fetch(`https://api.github.com/repos/nao-amj/starlight-issue-wiki/issues/${issueNumber}`);
        
        if (!response.ok) {
          throw new Error(`GitHub API Error: ${response.status}`);
        }
        
        const singleIssue = await response.json() as GitHubIssue;
        
        // Pull Requestでないか確認
        if (singleIssue.pull_request) {
          return null;
        }
        
        // キャッシュを更新
        cache.singleIssues[issueNumber] = {
          issue: singleIssue,
          timestamp: Date.now()
        };
        
        return singleIssue;
      } catch (error) {
        console.error(`Error fetching single issue #${issueNumber}:`, error);
        return null;
      }
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

// Issueのコメントを取得する関数
export async function getIssueComments(issueNumber: number): Promise<any[]> {
  try {
    // キャッシュをチェック
    const cachedComments = cache.comments[issueNumber];
    if (cachedComments && (Date.now() - cachedComments.timestamp < CACHE_TTL)) {
      return cachedComments.data;
    }
    
    console.log(`Fetching comments for issue #${issueNumber} from GitHub API`);
    
    const response = await fetch(`https://api.github.com/repos/nao-amj/starlight-issue-wiki/issues/${issueNumber}/comments`);
    
    if (!response.ok) {
      throw new Error(`GitHub API Error: ${response.status}`);
    }
    
    const comments = await response.json();
    
    // キャッシュを更新
    cache.comments[issueNumber] = {
      data: comments,
      timestamp: Date.now()
    };
    
    return comments;
  } catch (error) {
    console.error(`Error fetching comments for issue #${issueNumber}:`, error);
    return [];
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