/**
 * GitHub APIと通信するためのユーティリティ関数
 * ビルド時にAPIコールを最適化し、キャッシュする
 */

import fs from 'fs';
import path from 'path';

// キャッシュディレクトリ
const CACHE_DIR = './.cache';
// キャッシュの有効期限（ミリ秒）- 1時間
const CACHE_TTL = 60 * 60 * 1000;

// キャッシュディレクトリが存在しない場合は作成
function ensureCacheDir() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
}

/**
 * キャッシュからデータを取得
 * @param cacheKey キャッシュのキー
 * @returns キャッシュデータまたはnull
 */
function getFromCache(cacheKey: string): any | null {
  ensureCacheDir();
  const cachePath = path.join(CACHE_DIR, `${cacheKey}.json`);
  
  if (fs.existsSync(cachePath)) {
    try {
      const cacheData = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
      
      // キャッシュが有効期限内かチェック
      if (cacheData.timestamp && Date.now() - cacheData.timestamp < CACHE_TTL) {
        console.log(`Using cached data for ${cacheKey}`);
        return cacheData.data;
      } else {
        console.log(`Cache expired for ${cacheKey}`);
        return null;
      }
    } catch (error) {
      console.error(`Error reading cache for ${cacheKey}:`, error);
      return null;
    }
  }
  
  return null;
}

/**
 * データをキャッシュに保存
 * @param cacheKey キャッシュのキー
 * @param data 保存するデータ
 */
function saveToCache(cacheKey: string, data: any): void {
  ensureCacheDir();
  const cachePath = path.join(CACHE_DIR, `${cacheKey}.json`);
  
  try {
    fs.writeFileSync(
      cachePath,
      JSON.stringify({
        timestamp: Date.now(),
        data
      }),
      'utf8'
    );
    console.log(`Cached data for ${cacheKey}`);
  } catch (error) {
    console.error(`Error caching data for ${cacheKey}:`, error);
  }
}

/**
 * GitHubからすべてのIssueを取得（プルリクエストを除く）
 * キャッシュ機能付き
 */
export async function fetchAllIssues() {
  const cacheKey = 'all-issues';
  
  // キャッシュをチェック
  const cachedData = getFromCache(cacheKey);
  if (cachedData) {
    return cachedData;
  }
  
  try {
    console.log('Fetching all issues from GitHub API...');
    
    // 全ページを取得するための再帰的関数
    async function fetchAllPages(page = 1, allItems: any[] = []) {
      const response = await fetch(
        `https://api.github.com/repos/nao-amj/starlight-issue-wiki/issues?state=all&per_page=100&page=${page}`
      );
      
      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }
      
      const items = await response.json();
      
      // プルリクエストを除外
      const filteredItems = items.filter((item: any) => !item.pull_request);
      allItems.push(...filteredItems);
      
      // GitHub APIはLinkヘッダーで次のページを示す
      const linkHeader = response.headers.get('Link');
      if (linkHeader && linkHeader.includes('rel="next"')) {
        // 次のページがある場合は再帰呼び出し
        return fetchAllPages(page + 1, allItems);
      }
      
      return allItems;
    }
    
    const allIssues = await fetchAllPages();
    
    // レスポンスをキャッシュに保存
    saveToCache(cacheKey, allIssues);
    
    console.log(`Fetched ${allIssues.length} issues`);
    return allIssues;
  } catch (error) {
    console.error('Error fetching issues:', error);
    return [];
  }
}

/**
 * 特定のタグに関連するIssueを検索
 * キャッシュ機能付き
 */
export async function fetchIssuesByTag(tag: string) {
  const cacheKey = `issues-by-tag-${tag}`;
  
  // キャッシュをチェック
  const cachedData = getFromCache(cacheKey);
  if (cachedData) {
    return cachedData;
  }
  
  try {
    console.log(`Fetching issues for tag #${tag} from GitHub API...`);
    
    const response = await fetch(
      `https://api.github.com/search/issues?q=repo:nao-amj/starlight-issue-wiki%20%23${tag}%20in:body&per_page=50`
    );
    
    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // プルリクエストを除外
    const filteredItems = data.items.filter((item: any) => !item.pull_request);
    
    // レスポンスをキャッシュに保存
    saveToCache(cacheKey, filteredItems);
    
    console.log(`Fetched ${filteredItems.length} issues for tag #${tag}`);
    return filteredItems;
  } catch (error) {
    console.error(`Error fetching issues for tag ${tag}:`, error);
    return [];
  }
}

/**
 * Issueからすべてのタグを抽出
 * @param issues Issueデータの配列
 * @returns 一意のタグのリスト
 */
export function extractAllTags(issues: any[]) {
  const allTags = new Set<string>();
  
  issues.forEach(issue => {
    if (!issue.body) return;
    
    // ハッシュタグを検出
    const tagMatches = issue.body.match(/#([a-zA-Z0-9_-]+)/g);
    if (tagMatches) {
      tagMatches.forEach(tag => {
        const cleanTag = tag.substring(1).toLowerCase();
        allTags.add(cleanTag);
      });
    }
    
    // ラベルもタグとして扱う
    if (issue.labels && Array.isArray(issue.labels)) {
      issue.labels.forEach((label: any) => {
        if (typeof label === 'object' && label.name) {
          const labelName = label.name.toLowerCase();
          allTags.add(labelName);
        }
      });
    }
  });
  
  return Array.from(allTags);
}
