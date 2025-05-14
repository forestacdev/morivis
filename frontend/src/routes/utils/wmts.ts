async function parseWmtsCapabilities(url) {
	try {
		const response = await fetch(url);
		const xmlString = await response.text();

		const parser = new DOMParser();
		const xmlDoc = parser.parseFromString(xmlString, 'application/xml');

		// エラーチェック（XMLのパースに失敗した場合）
		if (xmlDoc.querySelector('parsererror')) {
			console.error('XML Parsing Error:', xmlDoc.querySelector('parsererror').textContent);
			return null;
		}

		// 必要な情報を抽出する例
		// ows:Title のように名前空間を含む要素は、querySelectorでは 'ows\\:Title' のようにエスケープするか
		// getElementsByTagNameNS を使用する必要があります。

		// レイヤーのタイトルを取得 (例)
		const layerTitleElement = xmlDoc.querySelector('Contents Layer ows\\:Title');
		const layerTitle = layerTitleElement ? layerTitleElement.textContent : 'Layer Title Not Found';

		// タイルテンプレートURLを取得
		const resourceUrlElement = xmlDoc.querySelector('Contents Layer ResourceURL');
		const template = resourceUrlElement ? resourceUrlElement.getAttribute('template') : null;

		// デフォルトのスタイル識別子を取得
		const defaultStyleElement = xmlDoc.querySelector(
			'Contents Layer Style[isDefault="true"] ows\\:Identifier'
		);
		const styleId = defaultStyleElement ? defaultStyleElement.textContent : 'default';

		// タイルマトリックスセット識別子を取得
		const tileMatrixSetElement = xmlDoc.querySelector(
			'Contents Layer TileMatrixSetLink TileMatrixSet'
		);
		const tileMatrixSetId = tileMatrixSetElement ? tileMatrixSetElement.textContent : null;

		// タイルサイズを取得 (最初のTileMatrixから)
		const tileWidthElement = xmlDoc.querySelector(
			'Contents TileMatrixSet TileMatrix ows\\:Identifier[id="0"] + TileWidth'
		);
		const tileSize = tileWidthElement ? parseInt(tileWidthElement.textContent, 10) : 256;

		// MapLibre用のURLを組み立てる
		let maplibreUrl = null;
		if (template && styleId && tileMatrixSetId) {
			maplibreUrl = template
				.replace('{Style}', styleId)
				.replace('{TileMatrixSet}', tileMatrixSetId)
				.replace('{TileMatrix}', '{z}')
				.replace('{TileRow}', '{y}')
				.replace('{TileCol}', '{x}');
		}

		// バウンディングボックスを取得 (例: WGS84)
		const wgs84BoundingBoxElement = xmlDoc.querySelector('Contents Layer ows\\:WGS84BoundingBox');
		let bounds = null;
		if (wgs84BoundingBoxElement) {
			const lowerCorner = wgs84BoundingBoxElement
				.querySelector('ows\\:LowerCorner')
				?.textContent.split(' ')
				.map(Number);
			const upperCorner = wgs84BoundingBoxElement
				.querySelector('ows\\:UpperCorner')
				?.textContent.split(' ')
				.map(Number);
			if (lowerCorner && upperCorner && lowerCorner.length === 2 && upperCorner.length === 2) {
				bounds = [lowerCorner[0], lowerCorner[1], upperCorner[0], upperCorner[1]]; // [west, south, east, north]
			}
		}

		return {
			layerTitle,
			template,
			styleId,
			tileMatrixSetId,
			maplibreUrl,
			tileSize,
			bounds
		};
	} catch (error) {
		console.error('Failed to fetch or parse WMTS Capabilities:', error);
		return null;
	}
}

// 使用例
const wmtsCapabilitiesUrl =
	'https://tiles.arcgis.com/tiles/jJQWqgqiNhLLjkin/arcgis/rest/services/Gifu2021CS_Mosic/MapServer/WMTS/1.0.0/WMTSCapabilities.xml';

parseWmtsCapabilities(wmtsCapabilitiesUrl).then((data) => {
	if (data && data.maplibreUrl) {
		console.log('Parsed WMTS Data:', data);
		// ここで取得した data.maplibreUrl, data.tileSize, data.bounds を使ってMapLibreを初期化する
		// 上記のMapLibreコード例の `tiles` や `tileSize`, `bounds` に `data` の値を使います。
	} else {
		console.log('Failed to get WMTS URL.');
	}
});
