// 静的データ用の型定義
export interface GitHubIssue {
  number: number;
  title: string;
  body: string;
  html_url: string;
  created_at: string;
  updated_at: string;
  labels: Array<{
    name: string;
    color: string;
    description?: string;
  }>;
  [key: string]: any; // その他のプロパティも許容
}

// TypeScriptがJSON importを適切に処理できるようにするための宣言
declare module "*.json" {
  const value: any;
  export default value;
}
