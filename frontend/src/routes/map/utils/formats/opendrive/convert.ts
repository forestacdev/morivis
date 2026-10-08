import proj4 from 'proj4';
import { getProjContext, isValidEpsg } from '../../proj/dict';
import { ensureProjNadgridsReady } from '../../proj/nadgrid';
import { type OpenDriveResult, parseOpenDrive } from '.';
import type { XY } from './geometry';

export const convertOpenDrive = async (
	text: string,
	sourceCrs?: string
): Promise<OpenDriveResult> => {
	const parsed = parseOpenDrive(text);
	const source = sourceCrs || parsed.sourceCrs;
	if (!source) return parsed;
	try {
		const code = source.match(/^EPSG:(\d+)$/i)?.[1];
		const definition = code && isValidEpsg(code) ? getProjContext(code) : source;
		await ensureProjNadgridsReady(definition);
		const converter = proj4(definition, 'EPSG:4326');
		const project = (point: XY): XY => {
			const output = converter.forward(point) as XY;
			if (
				!output.every(Number.isFinite) || Math.abs(output[0]) > 180
				|| Math.abs(output[1]) > 90
			) throw new Error('座標変換後の経緯度が範囲外です');
			return output;
		};
		// 変換途中で失敗しても、元のローカル座標へ戻せるようコピーする。
		const features = parsed.geojson.features.map(feature => {
			const g = feature.geometry;
			if (g.type !== 'LineString' && g.type !== 'Polygon') {
				throw new Error('不正な道路形状です');
			}
			return {
				...feature,
				geometry: g.type === 'LineString'
					? { type: 'LineString' as const, coordinates: g.coordinates.map(project) }
					: {
						type: 'Polygon' as const,
						coordinates: g.coordinates.map(ring => ring.map(project))
					}
			};
		});
		return {
			...parsed,
			geojson: { type: 'FeatureCollection', features },
			sourceCrs: source,
			spatialStatus: 'resolved'
		};
	} catch (error) {
		if (sourceCrs) {
			throw new Error(
				`OpenDRIVEの座標変換に失敗しました。座標系を確認してください（${
					error instanceof Error ? error.message : String(error)
				}）`
			);
		}
		return {
			...parsed,
			warnings: [
				...parsed.warnings,
				'geoReferenceを変換できませんでした。座標系を選択するか、位置合わせを行ってください。'
			]
		};
	}
};
