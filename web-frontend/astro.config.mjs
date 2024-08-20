import { defineConfig } from 'astro/config';
import icon from "astro-icon";
import { APIAddress } from './src/scripts/API';

import node from "@astrojs/node";

// https://astro.build/config
export default defineConfig({
  integrations: [icon()],
  output: 'server',
  adapter: node({
    mode: "middleware"
  }),
  vite: {
	server: {
		proxy: {
			'/api': {
				target: APIAddress,
				changeOrigin: true,
				secure: false,
				rewrite: path => path.replace(/^\/api/, '')
			}
		}
	}
  }
});