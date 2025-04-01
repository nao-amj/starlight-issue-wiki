import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import vercel from '@astrojs/vercel/static';

// https://astro.build/config
export default defineConfig({
  integrations: [
    starlight({
      title: 'Starlight Issue Wiki',
      social: {
        github: 'https://github.com/nao-amj/starlight-issue-wiki',
      },
      sidebar: [
        {
          label: 'ホーム',
          link: '/'
        },
        {
          label: 'Wiki',
          autogenerate: { directory: 'wiki' }
        }
      ],
    }),
  ],
  output: 'static',
  adapter: vercel(),
});