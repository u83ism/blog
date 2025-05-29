import { defineCollection, z } from 'astro:content';

const blogCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    date: z.string().transform((str) => new Date(str)),
    updated: z.string().optional().transform((str) => str ? new Date(str) : undefined),
    tags: z.array(z.string()),
    description: z.string(),
    published: z.boolean().default(true),
    slug: z.string().optional(),
  }),
});

export const collections = {
  blog: blogCollection,
};
