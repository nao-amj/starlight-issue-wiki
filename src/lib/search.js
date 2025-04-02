/**
 * 検索機能のユーティリティ関数
 */

/**
 * 検索文字列に一致するIssueをフィルタリングする
 * @param {Array} issues - Issueの配列
 * @param {string} query - 検索クエリ
 * @returns {Array} フィルタリングされたIssue配列
 */
export function filterIssuesByQuery(issues, query) {
  if (!query || query.length < 2) {
    return [];
  }
  
  const lowerQuery = query.toLowerCase();
  
  return issues.filter(issue => 
    issue.title.toLowerCase().includes(lowerQuery) || 
    (issue.body && issue.body.toLowerCase().includes(lowerQuery))
  );
}

/**
 * テキスト内の検索クエリをハイライトする
 * @param {string} text - 対象テキスト
 * @param {string} query - 検索クエリ
 * @returns {string} ハイライトされたHTML
 */
export function highlightText(text, query) {
  if (!text) return '';
  const regex = new RegExp(`(${escapeRegExp(query)})`, 'gi');
  return text.replace(regex, '<mark class="search-highlight">$1</mark>');
}

/**
 * 検索クエリに一致するテキストの前後のコンテキストを抽出する
 * @param {string} text - 対象テキスト
 * @param {string} query - 検索クエリ
 * @param {number} contextLength - 前後のコンテキストの長さ
 * @returns {string} 抽出されたテキスト
 */
export function extractContext(text, query, contextLength = 50) {
  if (!text) return '';
  
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const matchIndex = lowerText.indexOf(lowerQuery);
  
  if (matchIndex >= 0) {
    const startPos = Math.max(0, matchIndex - contextLength);
    const endPos = Math.min(text.length, matchIndex + lowerQuery.length + contextLength);
    let excerpt = text.substring(startPos, endPos);
    
    // 前後が切れている場合は省略記号を追加
    if (startPos > 0) excerpt = '...' + excerpt;
    if (endPos < text.length) excerpt = excerpt + '...';
    
    return excerpt;
  }
  
  // 本文にキーワードが含まれない場合は先頭を表示
  return text.substring(0, 100) + (text.length > 100 ? '...' : '');
}

/**
 * 正規表現用に文字列をエスケープする
 * @param {string} string - エスケープする文字列
 * @returns {string} エスケープされた文字列
 */
export function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
