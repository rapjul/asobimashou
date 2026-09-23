import js from "@eslint/js";
import globals from "globals";
import prettierConfig from "eslint-config-prettier";
import jsdoc from "eslint-plugin-jsdoc";
import tseslint from "typescript-eslint";

export default [
	js.configs.recommended,
	jsdoc.configs["flat/recommended"],
	...tseslint.configs.recommended.map((config) => ({
		...config,
		files: ["**/*.ts"],
	})),
	{
		...jsdoc.configs["flat/recommended-typescript"],
		files: ["**/*.ts"],
	},
	{
		files: ["**/*.ts"],
		settings: {
			jsdoc: {
				mode: "typescript",
			},
		},
		rules: {
			"jsdoc/no-defaults": "off",
			"jsdoc/no-types": "off",
			"jsdoc/tag-lines": "off",
		},
	},
	prettierConfig,
	{
		languageOptions: {
			ecmaVersion: 2022,
			sourceType: "module",
			globals: {
				...globals.browser,
				...globals.node,
				wanakana: "readonly",
			},
		},
		plugins: {
			jsdoc,
		},
		rules: {
			"jsdoc/require-jsdoc": [
				"warn",
				{
					require: {
						FunctionDeclaration: true,
						MethodDefinition: true,
						ClassDeclaration: true,
						ArrowFunctionExpression: false,
						FunctionExpression: false,
					},
				},
			],
			"jsdoc/require-description": "warn",
			"jsdoc/require-param": "warn",
			"jsdoc/require-returns": "warn",
		},
	},
	{
		ignores: [
			"dist/**",
			"dev-dist/**",
			"coverage/**",
			"node_modules/**",
			"assets/js/bootstrap.bundle.min.js",
			"playwright-report/**",
			"test-results/**",
		],
	},
];
