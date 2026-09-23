import { defineConfig } from "vitest/config";
import { VitePWA } from "vite-plugin-pwa";
import { fileURLToPath } from "node:url";

export default defineConfig({
	base: "./",
	resolve: {
		alias: {
			"@": fileURLToPath(new URL("./src", import.meta.url)),
		},
	},
	plugins: [
		VitePWA({
			registerType: "prompt",
			injectRegister: "auto",
			devOptions: {
				enabled: true,
			},
			manifest: {
				name: "Asobimashou",
				short_name: "Asobimashou",
				description:
					"Japanese Hiragana and Katakana reading practice web app with vocabulary drills, customizable phonetic filters, instant Romanization feedback, session review tables, and full offline PWA support.",
				theme_color: "#212529",
				background_color: "#212529",
				display: "standalone",
				icons: [
					{
						src: "favicon.svg",
						sizes: "any",
						type: "image/svg+xml",
						purpose: "any",
					},
					{
						src: "assets/images/icons/icon-192.png",
						sizes: "192x192",
						type: "image/png",
						purpose: "any",
					},
					{
						src: "assets/images/icons/icon-512.png",
						sizes: "512x512",
						type: "image/png",
						purpose: "any",
					},
					{
						src: "assets/images/icons/icon-512.png",
						sizes: "512x512",
						type: "image/png",
						purpose: "maskable",
					},
				],
				screenshots: [
					{
						src: "assets/images/preview.png",
						sizes: "1500x700",
						type: "image/png",
						form_factor: "wide",
						label: "Asobimashou Kana Practice Quiz Screen",
					},
				],
			},
			workbox: {
				globPatterns: [
					"**/*.{js,css,html,ico,png,svg,webp,json}",
					"**/bootstrap-icons-*.woff2",
				],
				runtimeCaching: [
					{
						urlPattern: /\.(?:woff|woff2|ttf|otf)$/,
						handler: "CacheFirst",
						options: {
							cacheName: "fonts-cache",
							expiration: {
								maxEntries: 10,
								maxAgeSeconds: 60 * 60 * 24 * 365,
							},
						},
					},
				],
			},
		}),
	],
	test: {
		globals: true,
		environment: "node",
		include: ["tests/unit/**/*.test.ts"],
		coverage: {
			provider: "v8",
			reporter: ["text", "json", "html"],
			include: ["src/**/*.ts"],
			exclude: ["src/types/**", "src/**/*.d.ts", "src/logic/index.ts"],
			thresholds: {
				lines: 85,
				functions: 90,
				branches: 70,
				statements: 85,
			},
		},
	},
});
