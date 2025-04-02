import { Octokit } from '@octokit/rest';

// GitHub APIから認証情報を取得
const getOctokit = () => {
  // 環境変数からトークンを取得
  // Astroのimport.meta.envは、ビルド時のみ利用可能なのでprocess.envも確認
  const token = process.env.GITHUB_TOKEN;
  return new Octokit({ auth: token });
};

// リポジトリの情報
const owner = process.env.REPO_OWNER || 'nao-amj';
const repo = process.env.REPO_NAME || 'starlight-issue-wiki';

// issueを取得する関数
export async function getIssues() {
  try {
    const octokit = getOctokit();
    const response = await octokit.issues.listForRepo({
      owner,
      repo,
      state: 'open',
      per_page: 100,
    });

    // wiki関連のissueのみを抽出（必要に応じてラベルでフィルタリング）
    return response.data.filter(issue => {
      // プルリクエストは除外
      if (issue.pull_request) return false;
      
      // ラベルでフィルタリング（オプション）
      // const hasWikiLabel = issue.labels.some(
      //   label => typeof label === 'object' && label.name === 'wiki'
      // );
      // return hasWikiLabel;
      
      return true;
    });
  } catch (error) {
    console.error('Error fetching issues:', error);
    return [];
  }
}

// 特定のissueを取得する関数
export async function getIssue(issueNumber: number) {
  try {
    const octokit = getOctokit();
    const response = await octokit.issues.get({
      owner,
      repo,
      issue_number: issueNumber,
    });

    return response.data;
  } catch (error) {
    console.error(`Error fetching issue #${issueNumber}:`, error);
    return null;
  }
}