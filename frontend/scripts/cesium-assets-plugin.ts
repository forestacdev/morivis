import { readdir, readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import type { Plugin } from 'vite';

// 依存パッケージの変換表を同梱する。Cesium Viewer用の画像・Workerは配信しない。
export const cesiumAssetsPlugin = (): Plugin => {
	const root = dirname(createRequire(import.meta.url).resolve('@cesium/engine/package.json'));
	const directory = join(root, 'Source/Assets/IAU2006_XYS');
	const prefix = 'vendor/cesium/Assets/IAU2006_XYS/';
	return {
		name: 'cesium-inertial-assets',
		configureServer: server => {
			server.middlewares.use(async (req, res, next) => {
				const pathname = (req.url ?? '').split('?')[0];
				const requestPrefix = `${server.config.base}${prefix}`;
				if (!pathname.startsWith(requestPrefix)) return next();
				const file = pathname.slice(requestPrefix.length);
				if (!/^IAU2006_XYS_\d+\.json$/.test(file)) return next();
				try {
					res.setHeader('Content-Type', 'application/json');
					res.end(await readFile(join(directory, file)));
				} catch (error) {
					next(error);
				}
			});
		},
		generateBundle: async (_options, bundle) => {
			const assets = (await readdir(directory))
				.filter(file => /^IAU2006_XYS_\d+\.json$/.test(file))
				.map(file => ({ fileName: `${prefix}${file}`, source: join(directory, file) }));
			assets.push({ fileName: 'vendor/cesium/LICENSE.md', source: join(root, 'LICENSE.md') });
			for (const { fileName, source } of assets) {
				bundle[fileName] = {
					type: 'asset',
					fileName,
					name: fileName,
					names: [fileName],
					originalFileName: null,
					originalFileNames: [],
					needsCodeReference: false,
					source: await readFile(source)
				};
			}
		}
	};
};
