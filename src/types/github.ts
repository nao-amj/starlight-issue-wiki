/**
 * GitHub IssueのラベルのType定義
 */
export interface LabelData {
  name: string;
  color: string;
  description: string | null;
}

/**
 * GitHub IssueのType定義
 */
export interface IssueData {
  number: number;
  title: string;
  body: string;
  html_url: string;
  created_at: string;
  updated_at: string;
  labels: LabelData[];
}

/**
 * カテゴリー情報のType定義
 */
export interface CategoryInfo {
  id: string;
  name: string;
  description?: string;
  count: number;
  color?: string;
}

/**
 * 静的JSONからのIssue読み込み用関数の返り値型
 */
export interface IssueDataResult {
  issues: IssueData[];
  categories: CategoryInfo[];
}
