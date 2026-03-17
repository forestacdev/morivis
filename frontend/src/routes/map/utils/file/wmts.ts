import WMTSCapabilities from 'ol/format/WMTSCapabilities.js';

export type MapLibreRasterSourceInfo = {
	id: string; // レイヤーのIdentifierなどを利用
	title: string; // レイヤーのTitle
	source: {
		type: 'raster';
		tiles: string[]; // URLテンプレートの配列
		tileSize?: number; // タイルサイズ (オプション)
		minzoom?: number; // 最小ズームレベル (オプション)
		maxzoom?: number; // 最大ズームレベル (オプション)
		attribution?: string; // 帰属表示 (オプション, Capabilitiesにない場合は別途指定が必要)
	};
	bounds?: [number, number, number, number]; // WGS84BoundingBox [minLon, minLat, maxLon, maxLat]
	// その他、Capabilitiesから取得したい情報があればここに追加
	format?: string;
	tileMatrixSet?: string;
	style?: string; // 使用するスタイルのIdentifier
};

export const parseWmtsCapabilities = async (
	url: string
): Promise<MapLibreRasterSourceInfo[] | null> => {
	try {
		const response = await fetch(url);
		if (!response.ok) {
			throw new Error(`Failed to fetch WMTS Capabilities: ${response.statusText}`);
		}
		const xmlString = await response.text();

		const parser = new WMTSCapabilities();
		const result = parser.read(xmlString);
		console.log('Parsed WMTS Capabilities:', result);

		const layersInfo: MapLibreRasterSourceInfo[] = [];
		const contents = result?.Contents;

		if (!contents || !contents.Layer || !contents.TileMatrixSet) {
			console.error(
				'Invalid WMTS Capabilities document structure. Missing Contents, Layer, or TileMatrixSet.'
			);
			return null;
		}

		// TileMatrixSetの情報をIdentifierをキーとするMapに変換しておくと参照が楽
		const tileMatrixSetsMap = new Map<string, any>();
		if (contents.TileMatrixSet) {
			contents.TileMatrixSet.forEach((tms: any) => {
				if (tms.Identifier) {
					tileMatrixSetsMap.set(tms.Identifier, tms);
				}
			});
		}

		// 各レイヤー情報を処理
		if (contents.Layer) {
			contents.Layer.forEach((layer: any) => {
				const layerId = layer.Identifier;
				const layerTitle = layer.Title || layerId; // Titleがない場合はIdentifierを使用

				// タイルURLテンプレートを取得
				const tileResource = layer.ResourceURL?.find((res: any) => res.resourceType === 'tile');

				if (tileResource && tileResource.template) {
					let templateUrl = tileResource.template;

					// 使用するスタイルを取得 (デフォルトスタイル優先)
					const defaultStyle = layer.Style?.find((s: any) => s.isDefault === true);
					const selectedStyleIdentifier =
						defaultStyle?.Identifier || layer.Style?.[0]?.Identifier || 'default'; // デフォルトが見つからない場合は最初のスタイル、それもなければ'default'

					// 使用するTileMatrixSetのIdentifierを取得
					// MapLibreはWeb Mercator (EPSG:3857) なので、互換性のあるTileMatrixSetを優先する
					const WEB_MERCATOR_CRSS = [
						'urn:ogc:def:crs:EPSG::3857',
						'urn:ogc:def:crs:EPSG:6.18:3:3857',
						'EPSG:3857',
						'urn:ogc:def:crs:EPSG::900913',
						'EPSG:900913'
					];

					const tileMatrixSetLinks = layer.TileMatrixSetLink ?? [];
					const preferredLink = tileMatrixSetLinks.find((link: any) => {
						const tms = tileMatrixSetsMap.get(link.TileMatrixSet);
						if (!tms?.SupportedCRS) return false;
						return WEB_MERCATOR_CRSS.includes(tms.SupportedCRS);
					});
					const tileMatrixSetLink = preferredLink ?? tileMatrixSetLinks[0];
					const selectedTileMatrixSetIdentifier = tileMatrixSetLink?.TileMatrixSet;

					if (!selectedTileMatrixSetIdentifier) {
						console.warn(`Layer "${layerTitle}" (${layerId}) does not have a TileMatrixSetLink.`);
						return; // このレイヤーはスキップ
					}

					// 選択されたTileMatrixSetがWeb Mercatorでない場合、スキップ
					// （EPSG:4326のタイルグリッドはMapLibreと互換性がない）
					const selectedTms = tileMatrixSetsMap.get(selectedTileMatrixSetIdentifier);
					if (selectedTms?.SupportedCRS && !WEB_MERCATOR_CRSS.includes(selectedTms.SupportedCRS)) {
						console.warn(
							`Layer "${layerTitle}" (${layerId}): TileMatrixSet "${selectedTileMatrixSetIdentifier}" uses ${selectedTms.SupportedCRS} which is not Web Mercator. Skipping.`
						);
						return;
					}

					// Dimensionのデフォルト値を取得して置換（例: {Time} → 2025-12-01）
					if (layer.Dimension) {
						for (const dim of layer.Dimension) {
							const dimId = dim.Identifier;
							const dimDefault = dim.Default;
							if (dimId && dimDefault) {
								templateUrl = templateUrl.replace(`{${dimId}}`, dimDefault);
							}
						}
					}

					// WMTSテンプレート変数をMapLibre形式に変換し、スタイルとTileMatrixSetを置換
					templateUrl = templateUrl
						.replace('{Style}', selectedStyleIdentifier)
						.replace('{TileMatrixSet}', selectedTileMatrixSetIdentifier)
						.replace('{TileMatrix}', '{z}')
						.replace('{TileCol}', '{x}')
						.replace('{TileRow}', '{y}');

					// TileMatrixSetLinkから対応するTileMatrixSetを探し、min/maxズームを取得
					let minzoom: number | undefined;
					let maxzoom: number | undefined;
					let tileSize: number | undefined;

					const tileMatrixSet = tileMatrixSetsMap.get(selectedTileMatrixSetIdentifier);

					if (tileMatrixSet && tileMatrixSet.TileMatrix) {
						const zoomLevels = tileMatrixSet.TileMatrix.map((tm: any) =>
							parseInt(tm.Identifier, 10)
						)
							.filter((zoom: number) => !isNaN(zoom))
							.sort((a: number, b: number) => a - b); // ズームレベルでソート

						if (zoomLevels.length > 0) {
							minzoom = zoomLevels[0];
							maxzoom = zoomLevels[zoomLevels.length - 1];
						}

						// タイルサイズを取得 (最初のTileMatrixから取得)
						if (tileMatrixSet.TileMatrix.length > 0) {
							tileSize = tileMatrixSet.TileMatrix[0].TileWidth; // TileHeightも同じはず
						}
					} else {
						console.warn(
							`TileMatrixSet "${selectedTileMatrixSetIdentifier}" not found for layer "${layerTitle}".`
						);
						// minzoom, maxzoom, tileSize は undefined のままになる
					}

					// WGS84BoundingBoxからboundsを取得
					let bounds: [number, number, number, number] | undefined;
					if (layer.WGS84BoundingBox && layer.WGS84BoundingBox.length === 4) {
						bounds = layer.WGS84BoundingBox as [number, number, number, number];
					}

					layersInfo.push({
						id: layerId,
						title: layerTitle,
						source: {
							type: 'raster',
							tiles: [templateUrl],
							tileSize: tileSize,
							minzoom: minzoom,
							maxzoom: maxzoom
						},
						bounds,
						format: layer.Format?.[0],
						tileMatrixSet: selectedTileMatrixSetIdentifier,
						style: selectedStyleIdentifier
					});
				} else {
					console.warn(`Layer "${layerTitle}" (${layerId}) does not have a tile ResourceURL.`);
				}
			});
		} else {
			console.warn('No layers found in the WMTS Capabilities document.');
		}

		return layersInfo;
	} catch (error) {
		console.error('Failed to fetch or parse WMTS Capabilities:', error);
		return null;
	}
};
