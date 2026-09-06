import { includeIgnoreFile } from '@eslint/compat';
import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import importPlugin from 'eslint-plugin-import';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';
import { fileURLToPath } from 'node:url';
import ts from 'typescript-eslint';

const gitignorePath = fileURLToPath(new URL('./.gitignore', import.meta.url));

export default [
	includeIgnoreFile(gitignorePath),
	{
		// Basisは外部ライブラリの配布ファイルをそのまま配置する。
		ignores: ['docs/**', 'static/basis/**']
	},
	js.configs.recommended,
	...ts.configs.recommended,
	...svelte.configs['flat/recommended'],
	prettier,
	...svelte.configs['flat/prettier'],
	{
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.node
			}
		},
		rules: {
			'@typescript-eslint/no-explicit-any': 'warn',
			'@typescript-eslint/no-unused-vars': [
				'warn',
				{
					argsIgnorePattern: '^_',
					varsIgnorePattern: '^_',
					caughtErrorsIgnorePattern: '^_',
					destructuredArrayIgnorePattern: '^_'
				}
			]
		}
	},
	{
		files: [
			'src/routes/stores/**/*.{js,ts,svelte}',
			'src/routes/map/components/**/*.{js,ts,svelte}'
		],
		rules: {
			'no-restricted-globals': [
				'error',
				{
					name: 'fetch',
					message:
						'直接 fetch は使わず、$routes/map/utils/platform/request のラッパー関数を使ってください。'
				}
			],
			'no-restricted-properties': [
				'error',
				{
					object: 'window',
					property: 'fetch',
					message:
						'window.fetch は使わず、$routes/map/utils/platform/request のラッパー関数を使ってください。'
				},
				{
					object: 'globalThis',
					property: 'fetch',
					message:
						'globalThis.fetch は使わず、$routes/map/utils/platform/request のラッパー関数を使ってください。'
				}
			]
		}
	},
	{
		files: ['**/*.svelte'],
		plugins: {
			import: importPlugin
		},
		languageOptions: {
			parserOptions: {
				parser: ts.parser,
				// svelte-eslint-parser 0.43ではgenerics属性の解析を明示的に有効化する。
				svelteFeatures: {
					experimentalGenerics: true
				}
			}
		},
		rules: {
			'import/order': [
				'error',
				{
					groups: [
						['builtin', 'external'],
						['internal', 'parent', 'sibling', 'index']
					],
					'newlines-between': 'always',
					alphabetize: {
						order: 'asc',
						caseInsensitive: true
					}
				}
			],
			'@typescript-eslint/no-unused-vars': [
				'warn',
				{
					argsIgnorePattern: '^_',
					varsIgnorePattern: '^_',
					caughtErrorsIgnorePattern: '^_',
					destructuredArrayIgnorePattern: '^_'
				}
			],
			'no-console': ['warn', { allow: ['warn', 'error'] }],
			camelcase: ['warn', { properties: 'never' }]
		}
	}
];
