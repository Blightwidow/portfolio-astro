import { defineCollection, z } from "astro:content";

const blog = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    subtitle: z.string(),
    date: z.date(),
  }),
});

const photography = defineCollection({
  type: "data",
  schema: ({ image }) =>
    z.object({
      alt: z.string(),
      description: z.string().optional(),
      date: z.date(),
      image: image(),
      tags: z.array(z.string()).optional(),
    }),
});

export const collections = {
  blog,
  photography,
};
