import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const blog = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/blog" }),
  schema: z.object({
    title: z.string(),
    subtitle: z.string(),
    date: z.date(),
  }),
});

const photography = defineCollection({
  loader: glob({ pattern: "**/*.yaml", base: "./src/content/photography" }),
  schema: ({ image }) =>
    z.object({
      alt: z.string(),
      description: z.string().optional(),
      date: z.date(),
      image: image(),
      tags: z.array(z.string()).optional(),
      hideFromGallery: z.boolean().default(false),
    }),
});

export const collections = {
  blog,
  photography,
};
