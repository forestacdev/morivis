import Encoding from 'encoding-japanese';

// 全て架空。フィールドをShift-JISのバイト位置に配置する。
export const record = (fields: Array<[number, string | number]>): string => {
	const bytes = new Uint8Array(84).fill(32);
	for (const [position, value] of fields) {
		bytes.set(
			Encoding.convert(Encoding.stringToCode(String(value)), {
				from: 'UNICODE',
				to: 'SJIS',
				type: 'array'
			}),
			position - 1
		);
	}
	return new TextDecoder('shift-jis').decode(bytes);
};
export const encode = (text: string): ArrayBuffer =>
	new Uint8Array(Encoding.convert(
		Encoding.stringToCode(text),
		{ from: 'UNICODE', to: 'SJIS', type: 'array' }
	)).buffer;
export const indexRecord = (zone = 7): string =>
	record([
		[1, 'I '],
		[3, String(zone).padStart(2)],
		[5, '試験機関'],
		[35, '  1'],
		[38, ' 0'],
		[40, '   0'],
		[80, 1]
	]);
export const drawingRecords = (id = '07AB001', unit = 1, mapLevel = 1000): string[] => [
	record([[1, 'M '], [3, id], [11, '試験図郭'], [31, String(mapLevel).padStart(5)], [
		36,
		'試験図面'
	], [68, 1]]),
	record([[1, '      0'], [8, '      0'], [15, '    100'], [22, '    100'], [
		45,
		String(unit).padStart(3)
	]]),
	record([[1, 'H '], [3, '3001'], [17, ' 1']])
];
export const elementRecords = (
	coordinates: number[][],
	{ figureType = 0, type = '1', classCode = '3001', elementId = 1 } = {}
): string[] => {
	const dimensions = coordinates[0]?.length ?? 2;
	const pointsPerRecord = dimensions === 3 ? 4 : 6;
	const header = record([
		[1, `E${type}`],
		[3, classCode],
		[13, String(elementId).padStart(4)],
		[17, ' 2'],
		[19, String(figureType).padStart(2)],
		[21, dimensions],
		[22, '60'],
		[24, 0],
		[25, ' 0'],
		[27, 0],
		[28, String(coordinates.length).padStart(4)],
		[32, String(Math.ceil(coordinates.length / pointsPerRecord)).padStart(4)]
	]);
	const rows = [header];
	for (let i = 0; i < coordinates.length; i += pointsPerRecord) {
		rows.push(
			record(
				coordinates.slice(i, i + pointsPerRecord).flat().map((value, index) =>
					[index * 7 + 1, String(value).padStart(7)] as [number, string]
				)
			)
		);
	}
	return rows;
};
export const outerRing = [[0, 0], [1000, 0], [1000, 1000], [0, 1000], [0, 0]];
export const innerRing = [[200, 200], [400, 200], [400, 400], [200, 400], [200, 200]];
export const dmText = (...elements: string[][]): string =>
	[...drawingRecords(), ...elements.flat()].join('\r\n');

export const legacyText = [
	indexRecord(4),
	record([[1, 'M '], [3, 'test-dm'], [11, '試験旧図郭'], [31, ' 1000']]),
	record([[1, 'F '], [3, '30'], [5, '01'], [9, '       1'], [17, 2], [33, '   2']]),
	record([[1, 'D2'], [3, '         0'], [13, '      1000'], [23, '      2000'], [
		33,
		'      3000'
	]])
].join('\r\n');
