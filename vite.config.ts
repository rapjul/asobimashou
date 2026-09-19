import { defineConfig } from "vitest/config";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
	base: "./",
	plugins: [
		VitePWA({
			registerType: "autoUpdate",
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
						src: "assets/images/icon-192.png",
						sizes: "192x192",
						type: "image/png",
					},
					{
						src: "assets/images/icon-512.png",
						sizes: "512x512",
						type: "image/png",
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
				globPatterns: ["**/*.{js,css,html,ico,png,svg,webp,json}"],
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
		},
	},
});
