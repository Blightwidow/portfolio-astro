import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";
import playformCompress from "@playform/compress";
import netlify from '@astrojs/netlify';

// https://astro.build/config
export default defineConfig({
  site: "https://dammaretz.fr",
  trailingSlash: "never",
  output: "static",
  integrations: [
    sitemap(),
    playformCompress({
      Image: false,
    }),
  ],
  prefetch: {
    prefetchAll: true,
    defaultStrategy: "viewport",
  },
  adapter: netlify(),
  redirects: {
    "/photography": "/photography/1",
  },
});
