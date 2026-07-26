import { defineCloudflareConfig } from "@opennextjs/cloudflare";

const baseConfig = defineCloudflareConfig({});

export default {
  ...baseConfig,
  edgeExternals: [
    ...(baseConfig.edgeExternals || []),
    "cloudflare:sockets",
    "cloudflare:workers",
  ],
};
