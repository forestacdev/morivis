import Papa from 'papaparse';
import JSZip from 'jszip';

// GTFS table row types
export interface Agency {
	agency_id: string;
	agency_name: string;
	agency_url: string;
	agency_timezone: string;
	[key: string]: string;
}

export interface Route {
	route_id: string;
	agency_id: string;
	route_short_name: string;
	route_long_name: string;
	route_type: string;
	[key: string]: string;
}

export interface Stop {
	stop_id: string;
	stop_name: string;
	stop_lon: number;
	stop_lat: number;
	location_type: number;
	parent_station: string | null;
	[key: string]: string | number | null;
}

export interface Trip {
	trip_id: string;
	route_id: string;
	service_id: string;
	shape_id?: string;
	[key: string]: string | undefined;
}

export interface StopTime {
	trip_id: string;
	stop_id: string;
	stop_sequence: number;
	arrival_time: string;
	departure_time: string;
	[key: string]: string | number;
}

export interface Shape {
	shape_id: string;
	shape_pt_lat: number;
	shape_pt_lon: number;
	shape_pt_sequence: number;
}

export interface GTFS {
	agency: Agency[];
	routes: Route[];
	stops: Stop[];
	trips: Trip[];
	stop_times: StopTime[];
	shapes: Shape[] | null;
}

const parseCsv = <T>(text: string): T[] => {
	const result = Papa.parse<T>(text, {
		header: true,
		skipEmptyLines: true
		// BOM対応: papaparseは自動でBOMをスキップする
	});
	return result.data;
};

const processStops = (rows: Record<string, string>[]): Stop[] =>
	rows.map(
		(row) =>
			({
				...row,
				stop_lon: parseFloat(row.stop_lon),
				stop_lat: parseFloat(row.stop_lat),
				location_type: row.location_type ? parseInt(row.location_type, 10) : 0,
				parent_station: row.parent_station || null
			}) as Stop
	);

const processShapes = (rows: Record<string, string>[]): Shape[] =>
	rows.map((row) => ({
		shape_id: row.shape_id,
		shape_pt_lat: parseFloat(row.shape_pt_lat),
		shape_pt_lon: parseFloat(row.shape_pt_lon),
		shape_pt_sequence: parseInt(row.shape_pt_sequence, 10)
	}));

const processStopTimes = (rows: Record<string, string>[]): StopTime[] =>
	rows.map(
		(row) =>
			({
				...row,
				stop_sequence: parseInt(row.stop_sequence, 10)
			}) as StopTime
	);

type TableName = 'agency' | 'routes' | 'stops' | 'trips' | 'stop_times' | 'shapes';

const buildGTFS = (tables: Map<string, string>): GTFS => {
	const agency = parseCsv<Agency>(tables.get('agency')!);
	const routes = parseCsv<Route>(tables.get('routes')!);
	const stops = processStops(parseCsv(tables.get('stops')!));
	const trips = parseCsv<Trip>(tables.get('trips')!);
	const stop_times = processStopTimes(parseCsv(tables.get('stop_times')!));
	const shapes = tables.has('shapes') ? processShapes(parseCsv(tables.get('shapes')!)) : null;

	// agency_idが1つしかなく、routesにagency_idがない場合は補完
	if (agency.length === 1) {
		const agencyId = agency[0].agency_id ?? '';
		for (const route of routes) {
			if (!route.agency_id) {
				route.agency_id = agencyId;
			}
		}
	}

	return { agency, routes, stops, trips, stop_times, shapes };
};

const USED_TABLES: TableName[] = ['agency', 'routes', 'stops', 'trips', 'stop_times', 'shapes'];

const REQUIRED_TABLES: TableName[] = ['agency', 'routes', 'stops', 'trips', 'stop_times'];

/**
 * ZIPファイルがGTFSかどうか判定する（必須テーブルの存在チェック）
 */
export const isGtfsZip = async (file: File): Promise<boolean> => {
	try {
		const zip = await JSZip.loadAsync(file);
		return REQUIRED_TABLES.every((name) => zip.file(`${name}.txt`) !== null);
	} catch {
		return false;
	}
};

/**
 * ZIPファイル（ArrayBuffer）からGTFSを読み込む
 */
export const loadGTFSFromZip = async (data: ArrayBuffer): Promise<GTFS> => {
	const zip = await JSZip.loadAsync(data);
	const tables = new Map<string, string>();

	for (const tableName of USED_TABLES) {
		const fileName = `${tableName}.txt`;
		const file = zip.file(fileName);
		if (file) {
			tables.set(tableName, await file.async('string'));
		}
	}

	if (tables.size === 0) {
		throw new Error('GTFSの必須ファイルがZIP内に見つかりません');
	}

	return buildGTFS(tables);
};
