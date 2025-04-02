import { defineCollection, z } from 'astro:content';

// Starlightを使わない独自のスキーマ定義
export const collections = {
  docs: defineCollection({
    schema: z.object({
      title: z.string(),
      description: z.string().optional(),
      date: z.string().or(z.date()).optional(),
      author: z.string().optional(),
      tags: z.array(z.string()).optional(),
      issueNumber: z.number().optional(),
      // 画像やその他のメタデータなど必要に応じて追加
      image: z.string().optional(),
      order: z.number().optional(),
    }),
  }),
};
