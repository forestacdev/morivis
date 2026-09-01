import { describe, expect, it } from 'vitest';

import type { GTFS } from './index';
import { readRoutes, readStops, readTimedStops } from './parse';

const createGtfs = (): GTFS => ({
	agency: [
		{
			agency_id: 'A1',
			agency_name: 'Agency',
			agency_url: 'https://example.com',
			agency_timezone: 'Asia/Tokyo'
		}
	],
	routes: [
		{
			route_id: 'R1',
			agency_id: 'A1',
			route_short_name: '10',
			route_long_name: 'Main ',
			route_type: '3',
			route_color: '00aa11'
		},
		{
			route_id: 'R2',
			agency_id: 'A1',
			route_short_name: '20',
			route_long_name: 'Loop ',
			route_type: '3',
			route_color: 'XYZ123'
		}
	],
	stops: [
		{
			stop_id: 'S1',
			stop_name: 'Central',
			stop_lon: 139.7,
			stop_lat: 35.6,
			location_type: 0,
			parent_station: null
		},
		{
			stop_id: 'S2',
			stop_name: 'West',
			stop_lon: 139.8,
			stop_lat: 35.7,
			location_type: 0,
			parent_station: null
		},
		{
			stop_id: 'S3',
			stop_name: 'Unused',
			stop_lon: 140,
			stop_lat: 35.8,
			location_type: 0,
			parent_station: null
		},
		{
			stop_id: 'S4',
			stop_name: 'East',
			stop_lon: 139.9,
			stop_lat: 35.75,
			location_type: 0,
			parent_station: null
		}
	],
	trips: [
		{ trip_id: 'T1', route_id: 'R1', service_id: 'WKD', shape_id: 'SH1' },
		{ trip_id: 'T2', route_id: 'R1', service_id: 'WKD', shape_id: 'SH2' },
		{ trip_id: 'T3', route_id: 'R2', service_id: 'SAT' }
	],
	stop_times: [
		{
			trip_id: 'T1',
			stop_id: 'S1',
			stop_sequence: 1,
			arrival_time: '08:00:00',
			departure_time: '08:00:30'
		},
		{
			trip_id: 'T1',
			stop_id: 'S2',
			stop_sequence: 2,
			arrival_time: '08:10:00',
			departure_time: '08:10:30'
		},
		{
			trip_id: 'T2',
			stop_id: 'S2',
			stop_sequence: 1,
			arrival_time: '09:00:00',
			departure_time: '09:00:00'
		},
		{
			trip_id: 'T2',
			stop_id: 'S4',
			stop_sequence: 2,
			arrival_time: '09:10:00',
			departure_time: '09:10:00'
		},
		{
			trip_id: 'T3',
			stop_id: 'S1',
			stop_sequence: 1,
			arrival_time: '10:00:00',
			departure_time: ''
		},
		{
			trip_id: 'T3',
			stop_id: 'S2',
			stop_sequence: 2,
			arrival_time: 'invalid',
			departure_time: ''
		}
	],
	shapes: [
		{ shape_id: 'SH1', shape_pt_lat: 35.6, shape_pt_lon: 139.7, shape_pt_sequence: 2 },
		{ shape_id: 'SH1', shape_pt_lat: 35.5, shape_pt_lon: 139.6, shape_pt_sequence: 1 },
		{ shape_id: 'SH2', shape_pt_lat: 35.7, shape_pt_lon: 139.8, shape_pt_sequence: 1 },
		{ shape_id: 'ORPHAN', shape_pt_lat: 35.9, shape_pt_lon: 140.1, shape_pt_sequence: 1 }
	]
});

describe('gtfs parser', () => {
	it('停留所を路線情報付きポイントに変換する', () => {
		const geojson = readStops(createGtfs(), { ignoreNoRoute: true });
		const central = geojson.features.find((feature) => feature.properties.stop_id === 'S1');
		const east = geojson.features.find((feature) => feature.properties.stop_id === 'S4');

		expect(geojson.features).toHaveLength(3);
		expect(central?.properties).toMatchObject({
			route_ids: ['R1', 'R2'],
			route_name: '複数路線',
			route_color: null
		});
		expect(east?.properties).toMatchObject({
			route_ids: ['R1'],
			route_name: 'Main 10',
			route_color: '#00AA11'
		});
	});

	it('stop_times を時刻順のポイントへ変換し、不正時刻を除外する', () => {
		const geojson = readTimedStops(createGtfs());

		expect(geojson.features).toHaveLength(5);
		expect(geojson.features.map((feature) => feature.properties.time_seconds)).toEqual([
			28830,
			29430,
			32400,
			33000,
			36000
		]);
		expect(geojson.features[0]?.properties).toMatchObject({
			stop_id: 'S1',
			route_id: 'R1',
			route_color: '#00AA11'
		});
		expect(geojson.features[4]?.properties.route_name).toBe('Loop 20');
	});

	it('shapes がある場合は shape ベースで route を作り、孤立 shape も残す', () => {
		const geojson = readRoutes(createGtfs());
		const route1 = geojson.features.find((feature) => feature.properties.route_id === 'R1');
		const orphan = geojson.features.find((feature) => feature.properties.route_id === null);

		expect(route1?.geometry.coordinates).toHaveLength(2);
		expect(route1?.geometry.coordinates[0]?.[0]).toEqual([139.6, 35.5]);
		expect(route1?.properties.route_color).toBe('#00AA11');
		expect(orphan?.properties.route_name).toBe('ORPHAN');
	});

	it('ignoreShapes 指定時は stop_times から route パターンを構築する', () => {
		const gtfs = createGtfs();
		gtfs.shapes = null;

		const geojson = readRoutes(gtfs, { ignoreShapes: true });
		const route1 = geojson.features.find((feature) => feature.properties.route_id === 'R1');
		const route2 = geojson.features.find((feature) => feature.properties.route_id === 'R2');

		expect(route1?.geometry.coordinates).toEqual([
			[
				[139.7, 35.6],
				[139.8, 35.7]
			],
			[
				[139.8, 35.7],
				[139.9, 35.75]
			]
		]);
		expect(route2?.geometry.coordinates).toEqual([[[139.7, 35.6], [139.8, 35.7]]]);
		expect(route2?.properties.route_color).toBe(null);
	});
});
