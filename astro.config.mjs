import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import { SITE_TITLE, SITE_DESCRIPTION, REPO_URL } from './src/config';

// https://astro.build/config
export default defineConfig({
  // サイトのベースURLを設定
  site: 'https://nao-amj.github.io',
  base: '/starlight-issue-wiki',
  
  // 出力ディレクトリを明示的に指定
  outDir: './dist',
  
  // 静的サイトとして出力
  output: 'static',
  
  // ビルド時の詳細設定
  build: {
    format: 'directory',
    assets: '_assets'
  },
  
  // Starlightインテグレーションを追加
  integrations: [
    starlight({
      title: SITE_TITLE,
      description: SITE_DESCRIPTION,
      
      // URL to GitHub repository
      social: {
        github: REPO_URL,
      },
      
      // Default locale for the site
      defaultLocale: 'ja',
      
      // Configure sidebar navigation
      sidebar: [
        {
          label: 'ホーム',
          link: '/',
        },
        {
          label: 'カテゴリー',
          items: [
            { label: 'すべてのページ', link: '/pages' },
            { label: 'ドキュメント', link: '/category/documentation' },
            { label: 'チュートリアル', link: '/category/tutorial' },
            { label: 'Wiki', link: '/category/wiki' },
          ],
        },
        {
          label: 'リソース',
          items: [
            { label: 'GitHub', link: REPO_URL },
            { label: 'Issue作成', link: `${REPO_URL}/issues/new` },
          ],
        },
      ],
      
      // Customize the sidebar behavior
      customCss: [
        // Starlightのデフォルトスタイルを拡張するカスタムCSS
        './src/styles/custom.css',
      ],
      
      // Enable search functionality
      components: {
        // ヘッダーとフッターのカスタムコンポーネントをオーバーライド
        Head: './src/components/CustomHead.astro',
        Footer: './src/components/CustomFooter.astro',
      },
    }),
  ],
});
