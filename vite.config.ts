import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/",
  server: {
    fs: {
      deny: [
        "**/.env*",
        "**/data/**",
        "**/server/**",
        "**/docs/**",
        "**/public/stickers/**",
      ],
    },
    proxy: {
      "/api": {
        target: process.env.BIRTHDAY_API_TARGET ?? "http://127.0.0.1:6173",
      },
      "/stickers": {
        target: process.env.BIRTHDAY_API_TARGET ?? "http://127.0.0.1:6173",
      },
    },
  },
  plugins: [react()],
});
