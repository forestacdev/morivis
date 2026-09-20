import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv } from 'vite';
import { parseRobloxWorld } from '../src/routes/map/utils/formats/roblox/index';
import {
	legacyMaterialMaps,
	modernMaterialMaps
} from '../src/routes/map/utils/formats/roblox/material-catalog';
import { materialMapKeys } from '../src/routes/map/utils/formats/roblox/materials';
import { robloxAssetKey } from '../src/routes/map/utils/formats/roblox/resources';
import { fetchRobloxAsset } from './roblox-asset-delivery';

const run = async () => {
	const args = process.argv.slice(2);
	if (!args.length || args.includes('--help')) {
		console.log(
			'pnpm --dir frontend run roblox:prepare [--standard-materials] [world.rbxl|world.rbxlx ...]'
		);
		console.log(
			'--standard-materials: 標準材質のカラー・法線・粗さ・金属感画像を取得（現行・旧版）'
		);
		return;
	}
	const includeStandard = args.includes('--standard-materials');
	const files = args.filter(arg => arg !== '--standard-materials');
	const unknownOption = files.find(arg => arg.startsWith('--'));
	if (unknownOption) throw new Error(`未対応のオプション: ${unknownOption}`);
	const root = fileURLToPath(new URL('../', import.meta.url));
	const apiKey = process.env.ROBLOX_API_KEY || loadEnv('development', root, '').ROBLOX_API_KEY;
	if (!apiKey) throw new Error('frontend/.env.local にROBLOX_API_KEYを設定してください。');
	const keys = new Set<string>();
	if (includeStandard) {
		for (
			const ids of [
				...Object.values(modernMaterialMaps),
				...Object.values(legacyMaterialMaps)
			]
		) {
			for (const id of ids) if (id) keys.add(`assets/${id}`);
		}
		console.log(
			`標準材質: 現行 ${Object.keys(modernMaterialMaps).length}種・旧版 ${
				Object.keys(legacyMaterialMaps).length
			}種 / 画像 ${keys.size}件（重複除外）`
		);
	}
	for (const file of files) {
		const buffer = await readFile(resolve(file));
		const world = await parseRobloxWorld(new Uint8Array(buffer).buffer);
		for (const part of world.parts) {
			const assets = [
				part.meshId,
				...part.textures?.map(texture => texture.asset) ?? [],
				...(part.material
					? materialMapKeys.map(key => part.material![key])
					: [part.textureId])
			];
			for (const asset of assets) {
				const key = asset && robloxAssetKey(asset);
				if (key) keys.add(key);
			}
		}
	}
	const output = resolve(root, 'static/roblox/assets');
	await mkdir(output, { recursive: true });
	const queue = [...keys];
	console.log(`取得対象 ${queue.length}件。配置済みの素材はスキップします。`);
	let cursor = 0, saved = 0, existing = 0, failed = 0;
	await Promise.all(Array.from({ length: Math.min(4, queue.length) }, async () => {
		while (cursor < queue.length) {
			const key = queue[cursor++];
			if (!key.startsWith('assets/')) {
				console.warn(`${key}: 組み込み素材は元ファイルを配置してください。`);
				failed++;
				continue;
			}
			const id = key.slice(7), target = resolve(output, id);
			try {
				await access(target);
				existing++;
				continue;
			} catch { /* 未配置 */ }
			try {
				const bytes = await fetchRobloxAsset(id, apiKey);
				await writeFile(target, bytes, { flag: 'wx' });
				saved++;
			} catch (error) {
				console.warn(`${id}: ${error instanceof Error ? error.message : '取得失敗'}`);
				failed++;
			}
			if ((saved + existing + failed) % 20 === 0) {
				console.log(
					`${
						saved + existing + failed
					}/${queue.length}件: 保存 ${saved} / 配置済み ${existing} / 未取得 ${failed}`
				);
			}
		}
	}));
	console.log(`保存 ${saved}件 / 配置済み ${existing}件 / 未取得 ${failed}件 → ${output}`);
	if (failed) process.exitCode = 1;
};
run().catch(error => {
	console.error(error instanceof Error ? error.message : '素材の準備に失敗しました。');
	process.exitCode = 1;
});
