import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel/static';

// https://astro.build/config
export default defineConfig({
  // サイトのベースURLを設定
  site: 'https://nao-amj.github.io',
  base: '/starlight-issue-wiki',
  // 出力ディレクトリを明示的に指定
  outDir: './dist',
  // ビルド時の詳細設定
  build: {
    format: 'directory',
    assets: '_assets'
  },
  // GitHub Pagesでの静的ホスティング用にadapterを追加
  adapter: vercel({
    webAnalytics: false,
    speedInsights: false,
    imagesConfig: false,
  }),
  // API routes用のSSR機能を有効化（必要に応じて）
  output: 'static',
  // pre-render静的ファイルとしてビルド
  // ただしAPIルートは別戦略で処理
  experimental: {
    staticMode: true,
  },
});
