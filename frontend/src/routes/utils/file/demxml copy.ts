import { XMLParser } from 'fast-xml-parser';

export const parseDemXml = async (xmlText: string) => {
	// パーサーのインスタンス作成
	const parser = new XMLParser({
		ignoreAttributes: false,
		attributeNamePrefix: '',
		processEntities: true,
		trimValues: true
	});
	const jsonObj = parser.parse(xmlText);

	console.log('Parsed JSON:', jsonObj);

	// ルート要素の取得（名前空間付きの場合はキー名に注意）
	const dataset = jsonObj['Dataset'] ?? jsonObj['dataset:Dataset'];
	if (!dataset) throw new Error('Dataset root not found');
	const dem = dataset['DEM'] ?? dataset['dataset:DEM'];
	if (!dem) throw new Error('DEM root not found');

	// メッシュコード
	const mesh_code = Number(dem['dataset:mesh'] ?? dem.mesh);

	console.log('Mesh Code:', mesh_code);

	// メタデータ取得
	const coverage = dem['dataset:coverage'] ?? dem.coverage;
	const boundedBy = coverage['gml:boundedBy'] ?? coverage.boundedBy;
	const envelope = boundedBy['gml:Envelope'] ?? boundedBy.Envelope;
	const lower_corner = envelope['gml:lowerCorner'] ?? envelope.lowerCorner;
	const upper_corner = envelope['gml:upperCorner'] ?? envelope.upperCorner;

	const gridDomain = coverage['gml:gridDomain'] ?? coverage.gridDomain;
	const grid = gridDomain['gml:Grid'] ?? gridDomain.Grid;
	const grid_length = grid['gml:high'] ?? grid.high;

	const coverageFunction = coverage['gml:coverageFunction'] ?? coverage.coverageFunction;
	const gridFunction = coverageFunction['gml:GridFunction'] ?? coverageFunction.GridFunction;
	const start_point = gridFunction['gml:startPoint'] ?? gridFunction.startPoint;

	// 標高値
	const rangeSet = coverage['gml:rangeSet'] ?? coverage.rangeSet;
	const dataBlock = rangeSet['gml:DataBlock'] ?? rangeSet.DataBlock;
	const tupleList = dataBlock['gml:tupleList'] ?? dataBlock.tupleList;

	// メタデータ整形
	const meta_data = {
		mesh_code,
		lower_corner: lower_corner.split(' ').map(Number),
		upper_corner: upper_corner.split(' ').map(Number),
		grid_length: grid_length ? grid_length.split(' ').map((x) => Number(x) + 1) : null, // または [0, 0] など適切なデフォルト値
		start_point: start_point ? start_point.split(' ').map(Number) : null
		// pixel_size等は必要に応じて計算
	};

	// 標高値リスト
	const items = tupleList
		.trim()
		.split('\n')
		.map((line) => line.split(',')[1]);

	// 結果
	return {
		mesh_code,
		meta_data,
		elevation: { mesh_code, items }
	};
};
