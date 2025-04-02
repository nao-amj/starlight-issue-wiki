/**
 * GitHub APIを操作するためのユーティリティ関数
 */
import { REPO_OWNER, REPO_NAME } from '../config';

/**
 * GitHubのIssue一覧を取得する
 * @param {Object} options - 取得オプション
 * @param {string} options.state - Issueの状態 ('all', 'open', 'closed')
 * @param {number} options.perPage - 1ページあたりの取得数
 * @returns {Promise<Array>} Issueの配列
 */
export async function fetchIssues({ state = 'all', perPage = 100 } = {}) {
  try {
    const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/issues?state=${state}&per_page=${perPage}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }
    
    return await response.json();
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
    
    return await response.json();
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
  return [...issues].sort((a, b) => {
    const dateA = new Date(a[dateField]).getTime();
    const dateB = new Date(b[dateField]).getTime();
    return order === 'asc' ? dateA - dateB : dateB - dateA;
  });
}
