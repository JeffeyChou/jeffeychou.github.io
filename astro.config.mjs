// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { unified } from '@astrojs/markdown-remark';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

export default defineConfig({
  site: 'https://jeffeychou.github.io',
  trailingSlash: 'ignore',
  integrations: [mdx(), sitemap({ filter: (page) => !page.includes('/lab/') })],
  markdown: {
    processor: unified({ remarkPlugins: [remarkMath], rehypePlugins: [rehypeKatex] }),
    shikiConfig: {
      themes: { light: 'github-light', dark: 'github-dark-dimmed' },
      defaultColor: false,
      langAlias: { cuda: 'cpp' },
      wrap: false,
    },
  },
  vite: {
    build: { chunkSizeWarningLimit: 900 },
  },
});
