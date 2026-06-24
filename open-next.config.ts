import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// useWorkerdCondition: false — without this, esbuild uses the "workerd" export
// condition on Linux (Docker/CI), which resolves pg-cloudflare to dist/index.js,
// a file not present in the OpenNext-bundled node_modules copy. On Windows,
// esbuild silently falls back to the project root's node_modules, masking the error.
// The "default" export (dist/empty.js) is the correct build-time stub; pg's workerd
// socket is wired at runtime by the Cloudflare runtime itself, not via esbuild bundling.
export default {
  ...defineCloudflareConfig({}),
  cloudflare: { useWorkerdCondition: false },
};
