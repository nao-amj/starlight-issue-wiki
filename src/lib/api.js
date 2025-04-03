/**
 * GitHub APIを操作するためのユーティリティ関数
 */
import { REPO_OWNER, REPO_NAME } from '../config';

/**
 * GitHubのIssue一覧を取得する (プルリクエストを除外)
 * @param {Object} options - 取得オプション
 * @param {string} options.state - Issueの状態 ('all', 'open', 'closed')
 * @param {number} options.perPage - 1ページあたりの取得数
 * @returns {Promise<Array>} Issueの配列
 */
export async function fetchIssues({ state = 'all', perPage = 100 } = {}) {
  try {
    // プルリクエストを除外するパラメータを追加
    const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/issues?state=${state}&per_page=${perPage}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }
    
    const issues = await response.json();
    
    // プルリクエスト（pull_request プロパティがあるもの）を除外
    return issues.filter(issue => !issue.pull_request);
  } catch (error) {
    console.error('Error fetching issues:', error);
    return [];
  }
}

/**
 * 特定のIssueをIDで取得する
 * @param {number} issueNumber - Issue番号
 * @returns {Promise<Object>} Issueデータ
 */
export async function fetchIssueById(issueNumber) {
  try {
    const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/issues/${issueNumber}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }
    
    const issue = await response.json();
    
    // プルリクエストの場合はnullを返す
    if (issue.pull_request) {
      console.warn(`Issue #${issueNumber} is a pull request, skipping`);
      return null;
    }
    
    return issue;
  } catch (error) {
    console.error(`Error fetching issue #${issueNumber}:`, error);
    return null;
  }
}

/**
 * Issueをカテゴリー別にグループ化する
 * @param {Array} issues - Issueの配列
 * @returns {Object} カテゴリー別にグループ化されたIssue
 */
export function groupIssuesByCategory(issues) {
  const categories = {};
  
  issues.forEach(issue => {
    // プルリクエストは除外
    if (issue.pull_request) return;
    
    if (issue.labels && issue.labels.length > 0) {
      issue.labels.forEach(label => {
        if (!categories[label.name]) {
          categories[label.name] = [];
        }
        // 重複を避けるために既に追加されていないか確認
        if (!categories[label.name].some(existingIssue => existingIssue.number === issue.number)) {
          categories[label.name].push(issue);
        }
      });
    } else {
      if (!categories['未分類']) {
        categories['未分類'] = [];
      }
      if (!categories['未分類'].some(existingIssue => existingIssue.number === issue.number)) {
        categories['未分類'].push(issue);
      }
    }
  });
  
  return categories;
}

/**
 * Issueを日付順にソートする
 * @param {Array} issues - Issueの配列
 * @param {string} order - ソート順 ('asc' または 'desc')
 * @param {string} dateField - 日付フィールド ('created_at' または 'updated_at')
 * @returns {Array} ソートされたIssue配列
 */
export function sortIssuesByDate(issues, order = 'desc', dateField = 'updated_at') {
  // プルリクエストを除外してからソート
  const filteredIssues = issues.filter(issue => !issue.pull_request);
  
  return filteredIssues.sort((a, b) => {
    const dateA = new Date(a[dateField]).getTime();
    const dateB = new Date(b[dateField]).getTime();
    return order === 'asc' ? dateA - dateB : dateB - dateA;
  });
}
