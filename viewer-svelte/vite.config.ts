import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
	plugins: [sveltekit()],
	resolve: {
		alias: {
			$services: path.resolve(__dirname, '../src/services'),
			$domain: path.resolve(__dirname, '../src/domain')
		}
	},
	// Include markdown files as assets for ?raw imports
	assetsInclude: ['**/*.md'],
	server: {
		port: 5176,
		fs: {
			// Allow serving files from the parent directory
			allow: ['..']
		}
	},
	preview: {
		port: 5176
	}
});
