import { SvelteKitPWA, type SvelteKitPWAOptions } from '@vite-pwa/sveltekit';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { Manifest, Plugin } from 'vite';

type PrecacheOutput = {
	type: 'chunk' | 'asset';
	fileName: string;
	isEntry?: boolean;
	imports?: string[];
};

// 起動エントリと静的importだけをたどる。dynamicImportsは使用時に取得する。
export const getLazyPrecacheIgnores = (bundle: Record<string, PrecacheOutput>): string[] => {
	const initialFiles = new Set<string>();
	const visit = (fileName: string) => {
		if (initialFiles.has(fileName)) return;
		const output = bundle[fileName];
		if (!output || output.type !== 'chunk') return;
		initialFiles.add(fileName);
		output.imports?.forEach(visit);
	};
	Object.values(bundle).filter((output) => output.isEntry).forEach((output) =>
		visit(output.fileName)
	);

	return Object.values(bundle)
		.filter((output) =>
			/\.[cm]?js$/.test(output.fileName) && !initialFiles.has(output.fileName)
		)
		.map((output) => `client/${output.fileName}`);
};

export const lazySvelteKitPWA = (userOptions: SvelteKitPWAOptions): Plugin[] => {
	const plugins = SvelteKitPWA(userOptions);
	// SvelteKit側が設定するURL変換を保持し、その後で遅延JSだけを除外する。
	const configureOptions = userOptions.integration!.configureOptions!;
	userOptions.integration!.configureOptions = (viteConfig, options) => {
		configureOptions(viteConfig, options);
		if (viteConfig.command !== 'build') return;
		options.workbox!.manifestTransforms!.push(async (entries) => {
			const manifest = JSON.parse(
				await readFile(
					resolve(options.workbox!.globDirectory!, 'client/.vite/manifest.json'),
					'utf8'
				)
			) as Manifest;
			const bundle = Object.fromEntries(
				Object.values(manifest).map((chunk) => [chunk.file, {
					type: 'chunk' as const,
					fileName: chunk.file,
					isEntry: chunk.isEntry,
					imports: chunk.imports?.map((key) => manifest[key].file)
				}])
			);
			const ignored = new Set(
				getLazyPrecacheIgnores(bundle).map((file) => file.slice('client/'.length))
			);
			return { manifest: entries.filter((entry) => !ignored.has(entry.url)) };
		});
	};
	return plugins;
};
