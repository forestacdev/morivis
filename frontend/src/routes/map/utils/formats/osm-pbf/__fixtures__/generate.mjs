// 架空の小さなOSMだけを手作業で構築する。nodeで実行して同じディレクトリへ出力する。
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const concat = (...parts) => Buffer.concat(parts);
const varint = value => {
	let n = BigInt(value);
	const bytes = [];
	while (n > 127n) {
		bytes.push(Number(n & 127n) | 128);
		n >>= 7n;
	}
	bytes.push(Number(n));
	return Buffer.from(bytes);
};
const zigzag = n => n < 0 ? -n * 2 - 1 : n * 2;
const uint = (tag, value) => concat(varint(tag * 8), varint(value));
const bytes = (tag, value) => concat(varint(tag * 8 + 2), varint(value.length), value);
const string = (tag, value) => bytes(tag, Buffer.from(value));
const packed = (tag, values, signed = false) =>
	bytes(tag, concat(...values.map(value => varint(signed ? zigzag(value) : value))));
const delta = values => values.map((value, index) => value - (values[index - 1] ?? 0));

const strings = ['', 'name', 'test-point', 'amenity', 'bench', 'highway', 'path', 'test-line',
	'building', 'yes', 'test-building', 'type', 'multipolygon', 'landuse', 'forest', 'test-area',
	'outer', 'inner', 'test:tag', '架空の属性'];
const sid = value => strings.indexOf(value);
const tags = entries => Object.keys(entries).length
	? concat(packed(2, Object.keys(entries).map(sid)), packed(3, Object.values(entries).map(sid)))
	: Buffer.alloc(0);
// 単純な任意の座標。点・線・建物・内周を持つrelationを含む。
const nodes = [
	[1, 2, 2], [2, 3, 2], [3, 3, 3], [4, 2, 3],
	[5, 2.25, 2.25], [6, 2.75, 2.25], [7, 2.75, 2.75], [8, 2.25, 2.75],
	[9, -1, -1]
];
const pointTags = { name: 'test-point', amenity: 'bench', 'test:tag': '架空の属性' };
const nodeMessages = () => concat(...nodes.map(([id, lon, lat]) => bytes(1, concat(
	uint(1, zigzag(id)), id === 9 ? tags(pointTags) : Buffer.alloc(0),
	uint(8, zigzag(lat * 1e7)), uint(9, zigzag(lon * 1e7))
))));
const denseNodes = () => bytes(2, concat(
	packed(1, delta(nodes.map(node => node[0])), true),
	packed(8, delta(nodes.map(node => node[2] * 1e7)), true),
	packed(9, delta(nodes.map(node => node[1] * 1e7)), true),
	packed(10, nodes.flatMap(([id]) => id === 9
		? [...Object.entries(pointTags).flatMap(([key, value]) => [sid(key), sid(value)]), 0]
		: [0]))
));
const way = (id, refs, attributes = {}) => bytes(3, concat(uint(1, id), tags(attributes), packed(8, delta(refs), true)));
const ways = concat(
	way(10, [1, 2], { name: 'test-line', highway: 'path' }),
	way(11, [1, 2, 3, 4, 1], { name: 'test-building', building: 'yes' }),
	way(12, [1, 2, 3, 4, 1]), way(13, [5, 6, 7, 8, 5])
);
const relation = bytes(4, concat(
	uint(1, 20), tags({ type: 'multipolygon', landuse: 'forest', name: 'test-area' }),
	packed(8, [sid('outer'), sid('inner')]), packed(9, delta([12, 13]), true), packed(10, [1, 1])
));
const primitive = group => concat(bytes(1, concat(...strings.map(value => string(1, value)))), bytes(2, group));
const block = (type, payload, compressed) => {
	const blob = compressed
		? concat(uint(2, payload.length), bytes(3, deflateSync(payload)))
		: bytes(1, payload);
	const header = concat(string(1, type), uint(3, blob.length));
	const size = Buffer.alloc(4);
	size.writeUInt32BE(header.length);
	return concat(size, header, blob);
};
const header = dense => concat(string(4, 'OsmSchema-V0.6'), ...(dense ? [string(4, 'DenseNodes')] : []));
for (const dense of [false, true]) {
	const fixture = concat(
		block('OSMHeader', header(dense), dense),
		block('OSMData', primitive(dense ? denseNodes() : nodeMessages()), dense),
		block('OSMData', primitive(ways), dense),
		block('OSMData', primitive(relation), dense)
	);
	writeFileSync(new URL(dense ? './test-dense.osm.pbf' : './test-raw.osm.pbf', import.meta.url), fixture);
	if (dense) {
		const corrupt = Buffer.from(fixture);
		corrupt[corrupt.length - 1] ^= 255;
		writeFileSync(new URL('./test-corrupt.osm.pbf', import.meta.url), corrupt);
	}
}
writeFileSync(new URL('./test-empty.osm.pbf', import.meta.url), block('OSMHeader', header(false), false));
writeFileSync(new URL('./test-unsupported.osm.pbf', import.meta.url),
	block('OSMHeader', concat(header(false), string(4, 'test-unsupported-feature')), false));
