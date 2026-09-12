import { describe, expect, it, vi } from 'vitest';

const imports = vi.hoisted(() => ({ gpx: 0, dwg: 0 }));
const cadImports = vi.hoisted(() => ({ jww: 0, cedxm: 0 }));
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
