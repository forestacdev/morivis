import { describe, expect, it } from 'vitest';

import { getProjContext } from './dict';
import { isWebMercatorPrj, isWgs84Prj, normalizePrjContent } from './crs-detect';

describe('proj crs detect', () => {
	it('WGS84 の WKT を判定できる', () => {
		const wgs84Wkt =
			'GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984"],PRIMEM["Greenwich",0],UNIT["Degree",0.0174532925199433]]';

		expect(isWgs84Prj(wgs84Wkt)).toBe(true);
	});

	it('ESRI 系の Web メルカトル WKT を 3857 として判定できる', () => {
		const esriWebMercatorWkt =
			'PROJCS["WGS_1984_Web_Mercator_Auxiliary_Sphere",GEOGCS["GCS_WGS_1984"],PROJECTION["Mercator_Auxiliary_Sphere"],AUTHORITY["EPSG","3857"]]';

		expect(isWebMercatorPrj(esriWebMercatorWkt)).toBe(true);
		expect(normalizePrjContent(esriWebMercatorWkt)).toBe(getProjContext('3857'));
	});

	it('通常の PRJ はそのまま返す', () => {
		const localPrj = 'PROJCS["JGD2011 / Japan Plane Rectangular CS IX"]';

		expect(isWebMercatorPrj(localPrj)).toBe(false);
		expect(normalizePrjContent(localPrj)).toBe(localPrj);
	});
});
