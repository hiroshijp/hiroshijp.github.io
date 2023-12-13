/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
	theme: {
		extend: {},
	},
	plugins: [
		require('@tailwindcss/typography'),
		require("daisyui"),
	],
	daisyui: {
		themes: [
			{
				mytheme: {
					"primary": "#1f245e",
					"secondary": "#dbeafe",
					"accent": "#111827",
					"neutral": "#a8a29e",
					"base-100": "#d7cfc7",
					"info": "#ffffff",
					"success": "green",
					"warning": "yellow",
					"error": "red",
				},
			},
		],
	},
}