import proj4 from 'proj4';
import { getProjContext, isValidEpsg } from '../../proj/dict';
import { ensureProjNadgridsReady } from '../../proj/nadgrid';
import { parseDgn } from './parser';

/** GDALを介さず、既存の座標系辞書とproj4でWGS84へ変換する。 */
export const convertDgn = async (bytes: Uint8Array, sourceCrs?: string) => {
	if (!sourceCrs) return parseDgn(bytes);
	const code = sourceCrs.match(/^EPSG:(\d+)$/i)?.[1];
	const definition = code && isValidEpsg(code) ? getProjContext(code) : sourceCrs;
	await ensureProjNadgridsReady(definition);
	let converter: proj4.Converter;
	try {
		converter = proj4(definition, 'EPSG:4326');
	} catch {
		throw new Error('DGNの変換元の座標系を確認してください');
	}
	return parseDgn(bytes, { project: point => converter.forward(point) });
};
