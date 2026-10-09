import { defineConfig, loadEnv } from 'vite';
import { envFrom } from './server/aiDesign';
import { aiDesignPlugin } from './server/vitePlugin';

export default defineConfig(({ mode }) => {
  // Load every variable from .env (not only VITE_ ones). These stay on the server: nothing here is
  // passed to `define`, so the key never ends up in the browser bundle.
  const env = { ...loadEnv(mode, process.cwd(), ''), ...process.env };
  return {
    plugins: [
      aiDesignPlugin(() => envFrom(env)),
    ],
  };
});
