import { createGlbEntry } from '$routes/map/data/entries/model';
import {
	getUploadedMinecraftRegion,
	getUploadedMinecraftRegions
} from '$routes/map/utils/three/model-source-unit';
import { Box3 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { describe, expect, it, vi } from 'vitest';
import { chunkFixture, regionFixture } from './__fixtures__/region';
import { validateMcaFileSet } from './batch';
import { mcaFilesToGlb } from './batch-convert';
import { createMcaModelFile } from './model-file';
import { createMcaRegionGridData } from './region-grid';
import type { McaProgress } from './types';

const regionFile = (x: number, z = 0) =>
	new File([
		regionFixture([{ nbt: chunkFixture({ x: x * 32, z: z * 32 }) }])
	], `r.${x}.${z}.mca`);

describe('MCAの一括取り込み', () => {
	it('負のregionを含むGLBを実ローダーで開き、各地形の位置・寸法を保つ', async () => {
		const progress: McaProgress[] = [];
		const files = [regionFile(-1), regionFile(0)];
		const result = await mcaFilesToGlb(files, {}, update => progress.push(update));
		expect(result).toMatchObject({ chunkCount: 2, blockCount: 2, faceCount: 12 });
		const gltf = await new GLTFLoader().parseAsync(result.glb, '');
		expect(gltf.scene.children).toHaveLength(2);
		const bounds = gltf.scene.children.map(child => new Box3().setFromObject(child));
		expect(bounds.map(box => box.min.toArray())).toEqual([[-512, 0, 0], [0, 0, 0]]);
		expect(bounds.map(box => box.max.toArray())).toEqual([[-511, 1, 1], [1, 1, 1]]);
		expect(new Set(progress.map(update => update.fileName))).toEqual(
			new Set(files.map(file => file.name))
		);
		expect(
			progress.some(update =>
				update.fileIndex === 2 && update.fileCount === 2 && update.stage === 'mesh'
			)
		).toBe(true);
	});

	it('全regionをentryに継承し、グリッドを周囲込み・重複なしで生成する', async () => {
		const files = [regionFile(-1), regionFile(0)];
		const result = await mcaFilesToGlb(files);
		const file = createMcaModelFile(result.glb, files.map(file => file.name));
		const entry = createGlbEntry(
			'test-world',
			'blob:test-world',
			{ lng: 0, lat: 0, altitude: 0 },
			'gltf',
			undefined,
			undefined,
			{
				minecraftRegion: getUploadedMinecraftRegion(file),
				minecraftRegions: getUploadedMinecraftRegions(file)
			}
		);
		expect(JSON.parse(JSON.stringify(entry)).format.minecraftRegions).toEqual([
			{ x: -1, z: 0 },
			{ x: 0, z: 0 }
		]);
		const grid = createMcaRegionGridData(entry);
		expect(grid.features).toHaveLength(12);
		expect(
			grid.features.filter(feature => feature.properties.current).map(feature =>
				feature.properties.name
			)
		).toEqual(['r.-1.0.mca', 'r.0.0.mca']);
		expect(new Set(grid.features.map(feature => feature.id)).size).toBe(12);
	});

	it.each([
		{ names: [], error: '選んでください' },
		{ names: ['test-invalid.mca'], error: '元のファイル名' },
		{ names: ['r.0.0.mca', 'test-model.glb'], error: '元のファイル名' },
		{ names: ['r.0.0.mca', 'r.00.0.MCA'], error: '重複' }
	])('空・不正名・異種・座標重複のセットを拒否する: $names', ({ names, error }) => {
		expect(() => validateMcaFileSet(names.map(name => ({ name })))).toThrow(error);
	});

	it('不正なセットではファイル本体を読み始めない', async () => {
		const file = regionFile(0);
		const read = vi.spyOn(file, 'arrayBuffer');
		await expect(mcaFilesToGlb([file, file])).rejects.toThrow('重複');
		expect(read).not.toHaveBeenCalled();
	});

	it('破損したファイル名を示して全体を中止する', async () => {
		await expect(mcaFilesToGlb([regionFile(0), new File(['test'], 'r.1.0.mca')])).rejects
			.toThrow('r.1.0.mca:');
	});

	it('ファイル名と中身のregionが違う場合も中止する', async () => {
		const file = new File([regionFixture()], 'r.1.0.mca');
		await expect(mcaFilesToGlb([regionFile(-1), file])).rejects.toThrow('r.1.0.mca:');
	});

	it('上限を増やすと同じファイルセットを取り込める', async () => {
		const files = [regionFile(0), regionFile(1), regionFile(2)];
		await expect(mcaFilesToGlb(files, { maxFaces: 12 })).rejects.toThrow('面数上限（12面）');
		await expect(mcaFilesToGlb(files, { maxFaces: 18 })).resolves.toMatchObject({
			faceCount: 18,
			chunkCount: 3
		});
	});

	it('制限なしでは複数リージョンの残り面数で停止せず全て取り込む', async () => {
		const files = [regionFile(0), regionFile(1), regionFile(2)];
		await expect(mcaFilesToGlb(files, { maxFaces: 12 })).rejects.toThrow('面数上限');
		const result = await mcaFilesToGlb(files, { maxFaces: 0 });
		expect(result).toMatchObject({ faceCount: 18, chunkCount: 3 });
		const gltf = await new GLTFLoader().parseAsync(result.glb, '');
		expect(gltf.scene.children).toHaveLength(3);
	});

	it('面数上限をセット全体に適用し、超過時は続くファイルを読まない', async () => {
		const last = regionFile(3);
		const read = vi.spyOn(last, 'arrayBuffer');
		await expect(
			mcaFilesToGlb([regionFile(0), regionFile(1), regionFile(2), last], { maxFaces: 12 })
		).rejects
			.toThrow('r.2.0.mca: 表示する面が多すぎます');
		expect(read).not.toHaveBeenCalled();
	});
});
