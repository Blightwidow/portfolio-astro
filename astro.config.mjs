import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";
import playformCompress from "@playform/compress";
import netlify from "@astrojs/netlify";

import react from "@astrojs/react";

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
    react(),
  ],
  prefetch: {
    prefetchAll: true,
    defaultStrategy: "viewport",
  },
  adapter: netlify(),
  redirects: {
    "/blog": "/blog/1",
    "/photography": "/photography/1",
  },
});
