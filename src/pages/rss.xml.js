import rss from "@astrojs/rss"

import { getAllPostByDate } from "../utils/blog"

export async function GET(context) {
  const posts = await getAllPostByDate("asc")

  return rss({
    title: "Blog posts | RSS Feed",
    description: "RSS feed for blog posts",
    site: context.site,
    items: posts.map((post) => ({
      title: post.data.title,
      pubDate: post.data.date,
      description: post.data.subtitle,
      link: `/blog/${post.slug}`,
    })),
  })
}
