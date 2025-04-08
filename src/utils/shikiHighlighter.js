// shikiHighlighter.js - シングルトンとしてShikiインスタンスを管理するためのユーティリティ
import { getHighlighter } from 'shiki';

// シングルトンインスタンスを保持する変数
let highlighterInstance = null;

/**
 * Shikiハイライターのシングルトンインスタンスを取得する
 * @returns {Promise<import('shiki').Highlighter>} Shikiハイライターインスタンス
 */
export async function getShikiHighlighter() {
  // インスタンスが存在しない場合のみ初期化
  if (!highlighterInstance) {
    console.log('[Shiki] Creating singleton highlighter instance');
    highlighterInstance = await getHighlighter({
      themes: ['github-light', 'github-dark'],
      langs: [
        'javascript', 'typescript', 'html', 'css', 'json', 'markdown', 'python', 'java', 
        'c', 'cpp', 'csharp', 'go', 'rust', 'bash', 'shell', 'yaml', 'toml', 'sql'
      ],
    });
  }
  
  return highlighterInstance;
}

/**
 * コードをハイライトして両方のテーマ用のHTMLを生成する
 * @param {string} code ハイライトするコード
 * @param {string} language 言語
 * @returns {Promise<{lightHtml: string, darkHtml: string}>} ライトテーマとダークテーマ用のHTML
 */
export async function highlightCode(code, language) {
  if (!language) {
    return {
      lightHtml: `<pre><code>${code}</code></pre>`,
      darkHtml: `<pre><code>${code}</code></pre>`
    };
  }

  try {
    const highlighter = await getShikiHighlighter();
    
    // テーマを取得
    const lightTheme = highlighter.getTheme('github-light');
    const darkTheme = highlighter.getTheme('github-dark');

    // 両方のテーマでコードをハイライト
    const lightHtml = highlighter.codeToHtml(code, { lang: language, theme: lightTheme });
    const darkHtml = highlighter.codeToHtml(code, { lang: language, theme: darkTheme });

    return { lightHtml, darkHtml };
  } catch (error) {
    console.error('[Shiki] Error highlighting code:', error);
    return {
      lightHtml: `<pre><code class="language-${language}">${code}</code></pre>`,
      darkHtml: `<pre><code class="language-${language}">${code}</code></pre>`
    };
  }
}
