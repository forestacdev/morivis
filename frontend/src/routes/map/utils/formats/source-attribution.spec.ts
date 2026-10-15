import { createGlbEntry } from '$routes/map/data/entries/model';
import { describe, expect, it } from 'vitest';
import { getUploadAttribution, withUploadAttribution } from './source-attribution';

describe('アップロード元の出典', () => {
	it.each([
		['test.STP', 'STEP'],
		['test.igs', 'IGES'],
		['test.gltf', 'glTF'],
		['test.glb', 'GLB'],
		['test.jpg', 'JPEG'],
		['test.tiff', 'GeoTIFF'],
		['test.png', 'PNG'],
		['test.webp', 'WebP'],
		['test.laz', 'LAZ']
	])('%sの形式名を表示する', (name, expected) => {
		expect(getUploadAttribution(new File([], name))).toBe(expected);
	});

	it.each(['STEP', 'IGES', 'DXF', 'DWG', 'VTK', 'CEDXM', 'RBXL'])(
		'%sからGLBへ変換してもentryの出典を保持する',
		(attribution) => {
			const file = withUploadAttribution(
				new File(['test-data'], 'test-model.glb'),
				attribution
			);
			const entry = createGlbEntry(
				'test-model',
				'blob:test-model',
				{ lng: 0, lat: 0, altitude: 0 },
				'gltf',
				undefined,
				undefined,
				{
					sourceFileName: file.name,
					attribution: getUploadAttribution(file)
				}
			);
			expect(entry.format.type).toBe('gltf');
			expect(JSON.parse(JSON.stringify(entry)).metaData.attribution).toBe(attribution);
		}
	);

	it('BDSからGeoJSONへの変換時も既定の出典より元の出典を優先する', async () => {
		const file = new File(['test-data'], 'test-data.geojson');
		expect(withUploadAttribution(file, 'BDS')).toBe(file);
		expect(getUploadAttribution(file, 'GeoJSON')).toBe('BDS');
		expect(await file.text()).toBe('test-data');
		expect(getUploadAttribution(new File([], 'test-data.json'), 'GeoJSON')).toBe('GeoJSON');
	});
});
