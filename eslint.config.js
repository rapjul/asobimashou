import js from "@eslint/js";
import globals from "globals";
import prettierConfig from "eslint-config-prettier";
import jsdoc from "eslint-plugin-jsdoc";

export default [
	js.configs.recommended,
	jsdoc.configs["flat/recommended"],
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
			"coverage/**",
			"node_modules/**",
			"assets/js/bootstrap.bundle.min.js",
			"assets/js/script.js",
			"playwright-report/**",
			"test-results/**",
		],
	},
];
