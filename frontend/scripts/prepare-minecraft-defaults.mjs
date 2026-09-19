import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * mcmetaのblocks summaryから、省略されたブロック状態の復元表を作る。
 * @param {Record<string, unknown>} summary
 */
export const extractDefaultStates = (summary) =>
	Object.fromEntries(
		Object.entries(summary).map(([name, entry]) => {
			const defaults = Array.isArray(entry) ? entry[1] : undefined;
			if (
				!/^[a-z0-9_./-]+$/.test(name) ||
				!defaults ||
				typeof defaults !== 'object' ||
				Array.isArray(defaults) ||
				!Object.values(defaults).every((value) => typeof value === 'string')
			) {
				throw new Error('ブロックの初期状態一覧が不正です');
			}
			return [`minecraft:${name}`, defaults];
		})
	);

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	const root = fileURLToPath(new URL('../../', import.meta.url));
	const source = path.resolve(root, process.argv[2] ?? '');
	if (!process.argv[2] || path.relative(root, source).startsWith('..')) {
		throw new Error('プロジェクト内のblocks summary JSONを指定してください');
	}
	const manifestPath = path.join(root, 'frontend/static/minecraft/manifest.json');
	const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
	if (!process.argv[3] || manifest.minecraftVersion !== process.argv[3]) {
		throw new Error('第2引数に素材と同じMinecraftバージョンを指定してください');
	}
	manifest.defaultStates = extractDefaultStates(JSON.parse(await readFile(source, 'utf8')));
	await writeFile(manifestPath, `${JSON.stringify(manifest, null, '\t')}\n`);
	console.log(`${Object.keys(manifest.defaultStates).length}種類の初期状態を追加しました`);
}
