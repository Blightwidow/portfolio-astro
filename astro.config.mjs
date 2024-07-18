import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import playformCompress from "@playform/compress";

// https://astro.build/config
export default defineConfig({
  site: "https://dammaretz.fr",
  trailingSlash: "never",
  output: "static",
  integrations: [sitemap(), playformCompress()],
  prefetch: {
    prefetchAll: true,
    defaultStrategy: "viewport",
  },
  experimental: {
    directRenderScript: true,
    contentCollectionCache: true,
    clientPrerender: true,
  },
});
