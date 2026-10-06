import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    // Cloudflare quick tunnel, ngrok, etc. (random subdomains per session)
    allowedHosts: [".trycloudflare.com", ".ngrok-free.app", ".ngrok.io"],
    proxy: {
      "/api": "http://localhost:3001",
      "/ws": {
        target: "ws://localhost:3001",
        ws: true,
      },
    },
  },
});
