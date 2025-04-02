import type { APIRoute } from 'astro';
import { Octokit } from '@octokit/rest';
import { REPO_OWNER, REPO_NAME } from '../../config';

// 環境変数からリポジトリ情報を取得
const owner = process.env.REPO_OWNER || REPO_OWNER;
const repo = process.env.REPO_NAME || REPO_NAME;

export const GET: APIRoute = async () => {
  try {
    // サーバーサイドでのみOctokitを初期化
    const token = process.env.GITHUB_TOKEN;
    const octokit = new Octokit({ auth: token });
    
    // GitHubからissueを取得
    const response = await octokit.issues.listForRepo({
      owner,
      repo,
      state: 'open',
      per_page: 100,
    });
    
    // プルリクエストを除外
    const issues = response.data.filter(issue => !issue.pull_request);
    
    console.log(`Successfully fetched ${issues.length} issues`);
    
    // クライアントに必要な情報のみを返す
    return new Response(
      JSON.stringify(issues),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          // キャッシュヘッダーを設定
          'Cache-Control': 'public, max-age=300' // 5分間キャッシュ
        }
      }
    );
  } catch (error) {
    console.error('Error fetching issues:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch issues', details: error.message }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  }
};

// 特定のIssueを取得するAPI
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { issueNumber } = body;
    
    if (!issueNumber) {
      return new Response(
        JSON.stringify({ error: 'Issue number is required' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
    }
    
    // サーバーサイドでのみOctokitを初期化
    const token = process.env.GITHUB_TOKEN;
    const octokit = new Octokit({ auth: token });
    
    // 特定のIssueを取得
    const response = await octokit.issues.get({
      owner,
      repo,
      issue_number: issueNumber,
    });
    
    console.log(`Successfully fetched issue #${issueNumber}`);
    
    return new Response(
      JSON.stringify(response.data),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300'
        }
      }
    );
  } catch (error) {
    console.error('Error fetching issue:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch issue', details: error.message }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  }
};