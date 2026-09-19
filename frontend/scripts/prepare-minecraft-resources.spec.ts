import JSZip from 'jszip';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { prepareMinecraftResources } from './prepare-minecraft-resources.mjs';

const projectRoot = fileURLToPath(new URL('../../', import.meta.url));
const temporary: string[] = [];
afterEach(async () => {
	await Promise.all(
		temporary.splice(0).map((directory) => rm(directory, { recursive: true, force: true }))
	);
});
describe('Minecraft素材の事前配置', () => {
	it.each(['folder', 'jar'])('%sから配信に必要な素材と一覧だけを配置する', async (kind) => {
		const directory = await mkdtemp(path.join(projectRoot, '.test-minecraft-'));
		temporary.push(directory);
		const assets = {
			'assets/test/blockstates/test-block.json': JSON.stringify({
				variants: { '': { model: 'test:block/test-model' } }
			}),
			'assets/test/models/block/test-model.json': JSON.stringify({ elements: [] }),
			'assets/test/textures/block/test-image.png': 'test-image-bytes',
			'assets/test/textures/block/test-image.png.mcmeta': JSON.stringify({
				animation: { frames: [1, 0] }
			}),
			'test-unrelated.class': 'test-ignored'
		};
		const source = path.join(directory, kind === 'jar' ? 'test-pack.jar' : 'input');
		if (kind === 'jar') {
			const zip = new JSZip();
			for (const [name, data] of Object.entries(assets)) zip.file(name, data);
			await writeFile(source, await zip.generateAsync({ type: 'nodebuffer' }));
		} else {
			for (const [name, data] of Object.entries(assets)) {
				const target = path.join(source, name);
				await mkdir(path.dirname(target), { recursive: true });
				await writeFile(target, data);
			}
		}
		const output = path.join(directory, 'output');
		expect(await prepareMinecraftResources(source, 'test-version', output)).toEqual({
			files: 4,
			blockstates: 1
		});
		const manifest = JSON.parse(await readFile(path.join(output, 'manifest.json'), 'utf8'));
		expect(manifest).toEqual({
			format: 1,
			minecraftVersion: 'test-version',
			blockstates: ['test:test-block'],
			animations: { 'test:block/test-image': { frames: [1, 0] } }
		});
		expect(
			await readFile(path.join(output, 'assets/test/models/block/test-model.json'), 'utf8')
		).toBe(assets['assets/test/models/block/test-model.json']);
		await expect(readFile(path.join(output, 'test-unrelated.class'))).rejects.toThrow();
	});
});
