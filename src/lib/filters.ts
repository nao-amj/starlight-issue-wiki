/**
 * GitHub Issueの表示をフィルタリングするユーティリティ関数
 */

// 除外するラベル/カテゴリー
export const EXCLUDED_LABELS = [
  'status',
  'priority',
  'invalid',
  'duplicate',
  'wontfix',
  'question',
  'enhancement',
  'bug',
  'help wanted'
];

/**
 * 特定のラベル（カテゴリー）が表示すべきかどうかを判定する
 * @param label - 判定するラベル名
 * @returns 表示すべき場合はtrue、除外すべき場合はfalse
 */
export function shouldShowLabel(label: string): boolean {
  return !EXCLUDED_LABELS.includes(label.toLowerCase());
}

/**
 * Issue（wiki記事）のラベルをフィルタリングする
 * @param labels - ラベルオブジェクトの配列
 * @returns フィルタリングされたラベルの配列
 */
export function filterLabels(labels: any[]): any[] {
  if (!labels || !Array.isArray(labels)) return [];
  
  return labels.filter(label => {
    const labelName = typeof label === 'string' ? label : label.name;
    return shouldShowLabel(labelName);
  });
}

/**
 * GitHub Issueのタグをフィルタリングする
 * @param tags - タグ文字列の配列
 * @returns フィルタリングされたタグの配列
 */
export function filterTags(tags: string[]): string[] {
  if (!tags || !Array.isArray(tags)) return [];
  
  return tags.filter(tag => shouldShowLabel(tag));
}
