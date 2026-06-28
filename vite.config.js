import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  base: "/",
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("react")) return "react";
          if (id.includes("@supabase")) return "supabase";
          return "vendor";
        },
      },
    },
  },
  server: {
    proxy: {
      "/api": "http://127.0.0.1:8787",
    },
  },
});
