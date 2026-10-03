import { describe, expect, it, vi } from 'vitest';

const imports = vi.hoisted(() => ({ gpx: 0, dwg: 0 }));
const s57Imports = vi.hoisted(() => ({ count: 0 }));
vi.mock('./form/S57Form.svelte', () => {
	s57Imports.count++;
	return { default: () => {} };
});
const vtkImports = vi.hoisted(() => ({ count: 0 }));
vi.mock('./form/VtkForm.svelte', () => {
	vtkImports.count++;
	return { default: () => {} };
});
vi.mock('./form/OpenDriveForm.svelte', () => ({ default: () => {} }));
vi.mock('./form/Jpeg2000Form.svelte', () => ({ default: () => {} }));
vi.mock('./form/MapInfoTabForm.svelte', () => ({ default: () => {} }));
vi.mock('./form/EnviBilForm.svelte', () => ({ default: () => {} }));
vi.mock('./form/AsciiGridForm.svelte', () => ({ default: () => {} }));
const stepIgesImports = vi.hoisted(() => ({ count: 0 }));
vi.mock('./form/StepIgesForm.svelte', () => {
	stepIgesImports.count++;
	return { default: () => {} };
});
const cadImports = vi.hoisted(() => ({ jww: 0, cedxm: 0 }));
const mcaImports = vi.hoisted(() => ({ count: 0 }));
vi.mock('./form/McaForm.svelte', () => {
	mcaImports.count++;
	return { default: () => {} };
});
vi.mock('./form/JwwForm.svelte', () => {
	cadImports.jww++;
	return { default: () => {} };
});
vi.mock('./form/CedxmForm.svelte', () => {
	cadImports.cedxm++;
	return { default: () => {} };
});
vi.mock('./form/GpxForm.svelte', () => {
	imports.gpx++;
	return { default: () => {} };
});
vi.mock('./form/DwgForm.svelte', () => {
	imports.dwg++;
	return { default: () => {} };
});

import { dialogRegistry } from './dialog-registry';

describe('dialog registry loading', () => {
	it('OpenDRIVEに座標系選択とベクター位置合わせを渡す', async () => {
		expect(dialogRegistry.opendrive!.profile).toBe('vector-zone-georef');
		expect((await dialogRegistry.opendrive!.load()).default).toBeTypeOf('function');
	});
	it('S-57フォームをファイル入力付きで遅延ロードする', async () => {
		expect(s57Imports.count).toBe(0);
		expect(dialogRegistry.s57!.profile).toBe('drop-file');
		expect((await dialogRegistry.s57!.load()).default).toBeTypeOf('function');
		expect(s57Imports.count).toBe(1);
	});
	it('VTKフォームをファイル入力付きで遅延ロードする', async () => {
		expect(vtkImports.count).toBe(0);
		expect(dialogRegistry.vtk!.profile).toBe('drop-file');
		expect((await dialogRegistry.vtk!.load()).default).toBeTypeOf('function');
		expect(vtkImports.count).toBe(1);
	});
	it('JPEG2000に座標系選択とラスター位置合わせを渡す', async () => {
		expect(dialogRegistry.jpeg2000!.profile).toBe('pointcloud-georef');
		expect((await dialogRegistry.jpeg2000!.load()).default).toBeTypeOf('function');
	});
	it('MapInfo TABにベクターの座標系選択・位置合わせを渡す', async () => {
		expect(dialogRegistry['mapinfo-tab']!.profile).toBe('vector-zone-georef');
		expect((await dialogRegistry['mapinfo-tab']!.load()).default).toBeTypeOf('function');
	});
	it('ENVI／ESRI BILに座標系と位置合わせの状態を渡す', async () => {
		expect(dialogRegistry['envi-bil']!.profile).toBe('pointcloud-georef');
		expect((await dialogRegistry['envi-bil']!.load()).default).toBeTypeOf('function');
	});
	it('ASCII Gridに座標系選択とラスター位置合わせの状態を渡す', async () => {
		expect(dialogRegistry['ascii-grid']!.profile).toBe('pointcloud-georef');
		expect((await dialogRegistry['ascii-grid']!.load()).default).toBeTypeOf('function');
	});
	it('STEP／IGES変換フォームを選択時だけ読み込む', async () => {
		expect(stepIgesImports.count).toBe(0);
		expect(dialogRegistry['step-iges']!.profile).toBe('drop-file');
		expect((await dialogRegistry['step-iges']!.load()).default).toBeTypeOf('function');
		expect(stepIgesImports.count).toBe(1);
	});
	it('Minecraftのフォームをファイル入力付きで遅延ロードする', async () => {
		expect(mcaImports.count).toBe(0);
		expect(dialogRegistry.mca!.profile).toBe('drop-file');
		expect((await dialogRegistry.mca!.load()).default).toBeTypeOf('function');
		expect(mcaImports.count).toBe(1);
	});
	it('JWW/JWC用フォームとCEDXM専用フォームを個別に読み込む', async () => {
		expect(cadImports).toEqual({ jww: 0, cedxm: 0 });
		const jww = await dialogRegistry.jww!.load();
		expect(cadImports).toEqual({ jww: 1, cedxm: 0 });
		const cedxm = await dialogRegistry.cedxm!.load();
		expect(cadImports).toEqual({ jww: 1, cedxm: 1 });
		expect(cedxm.default).not.toBe(jww.default);
		expect(dialogRegistry.jww!.profile).toBe('vector-zone-georef');
		expect(dialogRegistry.cedxm!.profile).toBe('vector-zone-georef');
	});
	it('レジストリ参照時にはフォームを読み込まず、選んだ形式だけを読み込む', async () => {
		expect(imports).toEqual({ gpx: 0, dwg: 0 });
		const first = await dialogRegistry.gpx!.load();
		expect(first.default).toBeTypeOf('function');
		expect(imports).toEqual({ gpx: 1, dwg: 0 });
		expect((await dialogRegistry.gpx!.load()).default).toBe(first.default);
		expect(imports).toEqual({ gpx: 1, dwg: 0 });
	});
});
