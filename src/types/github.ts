/**
 * GitHub APIから取得するIssueデータの型定義
 */
export interface IssueData {
  number: number;
  title: string;
  body: string;
  html_url: string;
  created_at: string;
  updated_at: string;
  labels: Label[];
  user?: {
    login: string;
    avatar_url: string;
    html_url: string;
  };
}

/**
 * GitHub APIから取得するLabelデータの型定義
 */
export interface Label {
  name: string;
  color: string;
  description?: string;
}

/**
 * カテゴリーデータの型定義
 */
export interface Category {
  id: string;
  name: string;
  count: number;
  color: string;
  description?: string;
}
