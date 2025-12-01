import type { Feature, FeatureCollection } from 'geojson';

// SIMA-S（シンプル形式）
export const simaSimpleToGeoJson = (simaText: string): FeatureCollection => {
	const lines = simaText
		.split('\n')
		.map((l) => l.trim())
		.filter((l) => l);
	const features: Feature[] = [];
	const points = new Map();

	let mode = '';

	lines.forEach((line) => {
		// モード切替
		if (line === 'C' || line === 'L' || line === 'P') {
			mode = line;
			return;
		}

		const parts = line.split(/\s+/);

		if (mode === 'C' && parts.length >= 3) {
			// 座標データ
			const name = parts[0];
			const x = parseFloat(parts[1]);
			const y = parseFloat(parts[2]);
			const z = parts[3] ? parseFloat(parts[3]) : undefined;

			points.set(name, { x, y, z });

			features.push({
				type: 'Feature',
				geometry: {
					type: 'Point',
					coordinates: z !== undefined ? [x, y, z] : [x, y]
				},
				properties: { name, elevation: z }
			});
		} else if (mode === 'L' && parts.length >= 2) {
			// 線データ
			const p1 = points.get(parts[0]);
			const p2 = points.get(parts[1]);

			if (p1 && p2) {
				features.push({
					type: 'Feature',
					geometry: {
						type: 'LineString',
						coordinates: [
							[p1.x, p1.y],
							[p2.x, p2.y]
						]
					},
					properties: { start: parts[0], end: parts[1] }
				});
			}
		}
	});

	return { type: 'FeatureCollection', features };
};

// SIMA-DM（データマネジメント形式）
export const simaDmToGeoJson = (simaText: string): FeatureCollection => {
	const lines = simaText
		.split('\n')
		.map((l) => l.trim())
		.filter((l) => l);
	const features: Feature[] = [];
	const points = new Map();

	// 地物コード定義
	const featureCodes: Record<string, string> = {
		'101': '境界点',
		'102': '建物角',
		'103': '道路中心点',
		'201': '境界線',
		'202': '建物輪郭',
		'203': '道路中心線',
		'301': '建物面',
		'302': '道路面'
	};

	let i = 0;
	while (i < lines.length) {
		const line = lines[i];

		if (line.startsWith('10')) {
			// 測点レコード
			const name = lines[i + 1] || '';
			const coords = (lines[i + 2] || '').split(/\s+/);
			const code = lines[i + 3] || '';

			if (coords.length >= 2) {
				const x = parseFloat(coords[0]);
				const y = parseFloat(coords[1]);
				const z = coords[2] ? parseFloat(coords[2]) : undefined;

				if (!isNaN(x) && !isNaN(y)) {
					points.set(name, { x, y, z });

					features.push({
						type: 'Feature',
						geometry: {
							type: 'Point',
							coordinates: z !== undefined ? [x, y, z] : [x, y]
						},
						properties: {
							name,
							code,
							featureType: featureCodes[code] || '不明',
							elevation: z
						}
					});
				}
			}
			i += 4;
		} else if (line.startsWith('20')) {
			// 線レコード
			const lineCode = lines[i + 1] || '';
			const pointNames: string[] = [];

			i += 2;
			while (i < lines.length && lines[i] !== '0') {
				pointNames.push(lines[i]);
				i++;
			}

			const coordinates = pointNames
				.map((name) => points.get(name))
				.filter((p) => p)
				.map((p) => [p.x, p.y]);

			if (coordinates.length >= 2) {
				features.push({
					type: 'Feature',
					geometry: {
						type: 'LineString',
						coordinates
					},
					properties: {
						code: lineCode,
						lineType: featureCodes[lineCode] || '不明',
						points: pointNames
					}
				});
			}
			i++; // '0'をスキップ
		} else if (line.startsWith('30')) {
			// 面レコード
			const areaCode = lines[i + 1] || '';
			const pointNames: string[] = [];

			i += 2;
			while (i < lines.length && lines[i] !== '0') {
				pointNames.push(lines[i]);
				i++;
			}

			const coordinates = pointNames
				.map((name) => points.get(name))
				.filter((p) => p)
				.map((p) => [p.x, p.y]);

			// 閉じたPolygonにする
			if (coordinates.length >= 3) {
				coordinates.push(coordinates[0]);

				features.push({
					type: 'Feature',
					geometry: {
						type: 'Polygon',
						coordinates: [coordinates]
					},
					properties: {
						code: areaCode,
						areaType: featureCodes[areaCode] || '不明',
						points: pointNames
					}
				});
			}
			i++; // '0'をスキップ
		} else {
			i++;
		}
	}

	return { type: 'FeatureCollection', features };
};

// SIMA-XML（XML形式）
export const simaXmlToGeoJson = (xmlText: string): FeatureCollection => {
	const parser = new DOMParser();
	const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

	const features: Feature[] = [];
	const points = new Map();

	// ヘッダー情報
	const projectName = xmlDoc.querySelector('ProjectName')?.textContent || '';
	const crs = xmlDoc.querySelector('CoordinateSystem')?.textContent || '';

	// 測点データ
	xmlDoc.querySelectorAll('Point').forEach((pointNode) => {
		const id = pointNode.getAttribute('id') || '';
		const name = pointNode.querySelector('Name')?.textContent || '';
		const x = parseFloat(pointNode.querySelector('X')?.textContent || '0');
		const y = parseFloat(pointNode.querySelector('Y')?.textContent || '0');
		const z = parseFloat(pointNode.querySelector('Z')?.textContent || '0');
		const code = pointNode.querySelector('FeatureCode')?.textContent || '';
		const desc = pointNode.querySelector('Description')?.textContent || '';

		points.set(id, { x, y, z, name });

		features.push({
			type: 'Feature',
			geometry: {
				type: 'Point',
				coordinates: [x, y, z]
			},
			properties: {
				id,
				name,
				code,
				description: desc,
				elevation: z
			}
		});
	});

	// 線データ
	xmlDoc.querySelectorAll('Line').forEach((lineNode) => {
		const code = lineNode.querySelector('FeatureCode')?.textContent || '';
		const desc = lineNode.querySelector('Description')?.textContent || '';
		const pointRefs = Array.from(lineNode.querySelectorAll('PointRef')).map(
			(ref) => ref.textContent || ''
		);

		const coordinates = pointRefs
			.map((id) => points.get(id))
			.filter((p) => p)
			.map((p) => [p.x, p.y, p.z]);

		if (coordinates.length >= 2) {
			features.push({
				type: 'Feature',
				geometry: {
					type: 'LineString',
					coordinates
				},
				properties: {
					code,
					description: desc,
					pointIds: pointRefs
				}
			});
		}
	});

	// 面データ
	xmlDoc.querySelectorAll('Polygon').forEach((polyNode) => {
		const code = polyNode.querySelector('FeatureCode')?.textContent || '';
		const desc = polyNode.querySelector('Description')?.textContent || '';
		const pointRefs = Array.from(polyNode.querySelectorAll('OuterRing PointRef')).map(
			(ref) => ref.textContent || ''
		);

		const coordinates = pointRefs
			.map((id) => points.get(id))
			.filter((p) => p)
			.map((p) => [p.x, p.y, p.z]);

		if (coordinates.length >= 3) {
			coordinates.push(coordinates[0]); // 閉じる

			features.push({
				type: 'Feature',
				geometry: {
					type: 'Polygon',
					coordinates: [coordinates]
				},
				properties: {
					code,
					description: desc,
					pointIds: pointRefs
				}
			});
		}
	});

	const geojson: FeatureCollection = {
		type: 'FeatureCollection',
		features
	};

	// メタデータを追加
	(geojson as any).metadata = {
		projectName,
		coordinateSystem: crs
	};

	return geojson;
};
