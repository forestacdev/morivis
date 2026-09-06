import { describe, expect, it, vi } from 'vitest';

const imports = vi.hoisted(() => ({ gpx: 0, dwg: 0 }));
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
	it('レジストリ参照時にはフォームを読み込まず、選んだ形式だけを読み込む', async () => {
		expect(imports).toEqual({ gpx: 0, dwg: 0 });
		const first = await dialogRegistry.gpx!.load();
		expect(first.default).toBeTypeOf('function');
		expect(imports).toEqual({ gpx: 1, dwg: 0 });
		expect((await dialogRegistry.gpx!.load()).default).toBe(first.default);
		expect(imports).toEqual({ gpx: 1, dwg: 0 });
	});
});
