import { defineConfig } from '@astrojs/starlight/config';
import { SITE_TITLE, SITE_DESCRIPTION, REPO_URL } from './config';

export default defineConfig({
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
  
  expressiveCode: {
    // コードブロックの表示設定
    styleOverrides: {
      borderRadius: '0.5rem',
    },
  },
});
