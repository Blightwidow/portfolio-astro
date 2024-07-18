import { defineCollection, z } from "astro:content"

const blog = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    subtitle: z.string(),
    date: z.date(),
  }),
})

// Export the blog collection, using an external schema from 'my-blog-theme'
export const collections = {
  blog,
}
