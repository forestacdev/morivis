import { createGeoJsonEntryWithMode } from '$routes/map/components/upload/form/geojson-entry';
import { createGeoJsonColorAccessors } from '$routes/map/utils/deck/geojson-color';
import { describe, expect, it, vi } from 'vitest';
import { parseKmlString } from './parse';
import { getKmlColorOptions, parseKmlStyles } from './styles';

vi.mock('$routes/stores/notification', () => ({ showNotification: vi.fn() }));

const document = (content: string) =>
	`<kml xmlns="http://www.opengis.net/kml/2.2"><Document>${content}</Document></kml>`;
const line = (style = '') =>
	`<Placemark>${style}<LineString><coordinates>0,0,10 1,1,20</coordinates></LineString></Placemark>`;
const lineStyle = (color: string) =>
	`<Style><LineStyle><color>${color}</color></LineStyle></Style>`;

const createEntry = async (renderMode: 'geojson' | 'deck') => {
	const { geojson } = await parseKmlString(
		document(line(lineStyle('ffffffff')) + line(lineStyle('ff0000ff')))
	);
	const entry = await createGeoJsonEntryWithMode({
		geojson,
		geometryType: 'LineString',
		name: 'test-kml-lines',
		bbox: [0, 0, 1, 1],
		attribution: 'KML',
		renderMode,
		...getKmlColorOptions(geojson, 'LineString')
	});
	return { entry, geojson };
};

describe('KMLの色情報の自動反映', () => {
	it('インラインの白と赤を、2Dベクターの初期分類色に使う', async () => {
		const { entry } = await createEntry('geojson');
		if (entry?.type !== 'vector') throw new Error('test vector required');
		expect(entry.style.colors.key).toBe('_kml_line_color');
		expect(
			entry.style.colors.expressions.find((expression) =>
				expression.key === '_kml_line_color'
			)
		).toMatchObject({
			type: 'match',
			mapping: { categories: ['#ffffff', '#ff0000'], values: ['#ffffff', '#ff0000'] }
		});
	});
	it('3Dの初期色と属性色へ渡し、各地物を元のRGBで描画する', async () => {
		const { entry, geojson } = await createEntry('deck');
		if (entry?.type !== 'model' || entry.style.type !== 'geoarrow') {
			throw new Error('test deck vector required');
		}
		expect(entry.style).toMatchObject({ color: '#ffffff', colorProperty: '_kml_line_color' });
		const { getLineColor } = createGeoJsonColorAccessors(entry.style);
		if (typeof getLineColor !== 'function') throw new Error('test color accessor required');
		expect(getLineColor(geojson.features[0]).slice(0, 3)).toEqual([255, 255, 255]);
		expect(getLineColor(geojson.features[1]).slice(0, 3)).toEqual([255, 0, 0]);
	});
	it('共有StyleよりインラインStyleの色を優先する', async () => {
		const text = document(
			'<Style id="test-style"><LineStyle><color>ff00ff00</color></LineStyle></Style>'
				+ line('<styleUrl>#test-style</styleUrl>' + lineStyle('ffffffff'))
		);
		const { geojson } = await parseKmlString(text);
		expect(geojson.features[0].properties?._kml_line_color).toBe('#ffffff');
	});
	it('数字のみのKML色コードも文字列として解析する', () => {
		expect(
			parseKmlStyles(
				document(
					'<Style id="test-style"><LineStyle><color>00000000</color></LineStyle></Style>'
				)
			).lineColors.get('test-style')
		).toBe('#000000');
	});
	it('色指定がないときは既存の既定色設定に任せる', async () => {
		const { geojson } = await parseKmlString(document(line()));
		expect(getKmlColorOptions(geojson, 'LineString')).toEqual({});
	});
	it('ポリゴンは塗り色を選び、線の色と混同しない', async () => {
		const { geojson } = await parseKmlString(
			document(
				`<Placemark><Style><LineStyle><color>ff0000ff</color></LineStyle><PolyStyle><color>ff00ff00</color></PolyStyle></Style><Polygon><outerBoundaryIs><LinearRing><coordinates>0,0 1,0 0,1 0,0</coordinates></LinearRing></outerBoundaryIs></Polygon></Placemark>`
			)
		);
		expect(getKmlColorOptions(geojson, 'Polygon')).toMatchObject({
			defaultColor: '#00ff00',
			colorProperty: '_kml_fill_color'
		});
	});
});
