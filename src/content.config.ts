import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    summary: z.string(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
    toc: z.boolean().default(true),
  }),
});

const projects = defineCollection({
  loader: glob({ pattern: '*.{md,mdx}', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    /** one or two sentences: the card text and the lead of the post */
    summary: z.string(),
    repo: z.url(),
    /** a live demo or documentation site */
    demo: z.url().optional(),
    demoLabel: z.string().default('Live demo'),
    /** npm package name */
    npm: z.string().optional(),
    stack: z.array(z.string()).default([]),
    license: z.string().default('MIT'),
    year: z.number(),
    /** position on the Dev page, smallest first */
    order: z.number().default(100),
    /** shown above the post: a live page in an iframe, or an image/GIF */
    preview: z
      .object({
        kind: z.enum(['iframe', 'image']),
        src: z.url(),
        alt: z.string().default(''),
        width: z.number().optional(),
        height: z.number().optional(),
      })
      .optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { blog, projects };
