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
					const tileMatrixSetLink = layer.TileMatrixSetLink?.[0]; // 最初のTileMatrixSetLinkを使用
					const selectedTileMatrixSetIdentifier = tileMatrixSetLink?.TileMatrixSet;

					if (!selectedTileMatrixSetIdentifier) {
						console.warn(`Layer "${layerTitle}" (${layerId}) does not have a TileMatrixSetLink.`);
						return; // このレイヤーはスキップ
					}

					// WMTSテンプレート変数をMapLibre形式に変換し、スタイルとTileMatrixSetを置換
					templateUrl = templateUrl
						.replace('{Style}', selectedStyleIdentifier)
						.replace('{TileMatrixSet}', selectedTileMatrixSetIdentifier)
						.replace('{TileMatrix}', '{z}')
						.replace('{TileCol}', '{x}') // ArcGIS形式は {TileRow}/{TileCol} の順が多いことに注意
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

					layersInfo.push({
						id: layerId,
						title: layerTitle,
						source: {
							type: 'raster',
							tiles: [templateUrl], // MapLibreはtilesにURLの配列を取る
							tileSize: tileSize,
							minzoom: minzoom,
							maxzoom: maxzoom
							// attribution: '...', // 必要に応じて追加
						},
						format: layer.Format?.[0], // レイヤーのフォーマット
						tileMatrixSet: selectedTileMatrixSetIdentifier, // 使用しているTileMatrixSetのIdentifier
						style: selectedStyleIdentifier // 使用しているスタイルのIdentifier
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
