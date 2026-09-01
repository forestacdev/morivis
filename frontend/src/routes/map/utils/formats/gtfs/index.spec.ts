import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';

import { isGtfsZip, loadGTFSFromFiles, loadGTFSFromZip } from './index';

const createGtfsTables = (overrides: Partial<Record<string, string>> = {}) => ({
	'agency.txt': `agency_id,agency_name,agency_url,agency_timezone
A1,Sample Agency,https://example.com,Asia/Tokyo`,
	'routes.txt': `route_id,agency_id,route_short_name,route_long_name,route_type,route_color
R1,,10,Main Line,3,00aa11`,
	'stops.txt': `stop_id,stop_name,stop_lon,stop_lat,location_type,parent_station
S1,Central,139.7,35.6,,`,
	'trips.txt': `route_id,service_id,trip_id,shape_id
R1,WKD,T1,SH1`,
	'stop_times.txt': `trip_id,arrival_time,departure_time,stop_id,stop_sequence
T1,08:00:00,08:00:30,S1,1`,
	'shapes.txt': `shape_id,shape_pt_lat,shape_pt_lon,shape_pt_sequence
SH1,35.6,139.7,1`,
	...overrides
});

const createZipBuffer = async (tables: Record<string, string>) => {
	const zip = new JSZip();

	for (const [name, content] of Object.entries(tables)) {
		zip.file(`nested/${name}`, content);
	}

	return await zip.generateAsync({ type: 'arraybuffer' });
};

describe('gtfs file loader', () => {
	it('必須テーブルを含む ZIP を GTFS と判定する', async () => {
		const buffer = await createZipBuffer(createGtfsTables());
		const file = new File([buffer], 'sample.zip', { type: 'application/zip' });

		await expect(isGtfsZip(file)).resolves.toBe(true);
	});

	it('必須テーブルが欠ける ZIP は GTFS 判定しない', async () => {
		const { ['stop_times.txt']: _removed, ...tables } = createGtfsTables();
		const buffer = await createZipBuffer(tables);
		const file = new File([buffer], 'broken.zip', { type: 'application/zip' });

		await expect(isGtfsZip(file)).resolves.toBe(false);
	});

	it('ZIP から GTFS を読み込み、routes の agency_id を補完する', async () => {
		const buffer = await createZipBuffer(createGtfsTables());
		const gtfs = await loadGTFSFromZip(buffer);

		expect(gtfs.routes[0]?.agency_id).toBe('A1');
		expect(gtfs.stops[0]).toMatchObject({
			stop_id: 'S1',
			stop_lon: 139.7,
			stop_lat: 35.6,
			location_type: 0,
			parent_station: null
		});
		expect(gtfs.shapes).toHaveLength(1);
	});

	it('ファイル配列からも GTFS を読み込める', async () => {
		const files = Object.entries(createGtfsTables()).map(
			([name, content]) => new File([content], name, { type: 'text/plain' })
		);

		const gtfs = await loadGTFSFromFiles(files);

		expect(gtfs.stop_times[0]?.stop_sequence).toBe(1);
		expect(gtfs.shapes?.[0]?.shape_pt_sequence).toBe(1);
	});

	it('必須テーブルが不足すると明示的にエラーにする', async () => {
		const files = [
			new File([createGtfsTables()['agency.txt']], 'agency.txt'),
			new File([createGtfsTables()['routes.txt']], 'routes.txt')
		];

		await expect(loadGTFSFromFiles(files)).rejects.toThrow(
			'GTFSの必須ファイルが不足しています'
		);
	});
});
