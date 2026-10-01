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

const strings = [
	'',
	'name',
	'test-point',
	'amenity',
	'bench',
	'highway',
	'path',
	'test-line',
	'building',
	'yes',
	'test-building',
	'type',
	'multipolygon',
	'landuse',
	'forest',
	'test-area',
	'outer',
	'inner',
	'test:tag',
	'架空の属性'
];
const sid = value => strings.indexOf(value);
const tags = entries =>
	Object.keys(entries).length
		? concat(
			packed(2, Object.keys(entries).map(sid)),
			packed(3, Object.values(entries).map(sid))
		)
		: Buffer.alloc(0);
// 単純な任意の座標。点・線・建物・内周を持つrelationを含む。
const nodes = [
	[1, 2, 2],
	[2, 3, 2],
	[3, 3, 3],
	[4, 2, 3],
	[5, 2.25, 2.25],
	[6, 2.75, 2.25],
	[7, 2.75, 2.75],
	[8, 2.25, 2.75],
	[9, -1, -1]
];
const pointTags = { name: 'test-point', amenity: 'bench', 'test:tag': '架空の属性' };
const nodeMessages = () =>
	concat(...nodes.map(([id, lon, lat]) =>
		bytes(
			1,
			concat(
				uint(1, zigzag(id)),
				id === 9 ? tags(pointTags) : Buffer.alloc(0),
				uint(8, zigzag(lat * 1e7)),
				uint(9, zigzag(lon * 1e7))
			)
		)
	));
const denseNodes = () =>
	bytes(
		2,
		concat(
			packed(1, delta(nodes.map(node => node[0])), true),
			packed(
				8,
				delta(nodes.map(node => node[2] * 1e7)),
				true
			),
			packed(9, delta(nodes.map(node => node[1] * 1e7)), true),
			packed(
				10,
				nodes.flatMap(([id]) =>
					id === 9
						? [
							...Object.entries(pointTags).flatMap((
								[key, value]
							) => [sid(key), sid(value)]),
							0
						]
						: [0]
				)
			)
		)
	);
const way = (id, refs, attributes = {}) =>
	bytes(3, concat(uint(1, id), tags(attributes), packed(8, delta(refs), true)));
const ways = concat(
	way(10, [1, 2], { name: 'test-line', highway: 'path' }),
	way(11, [1, 2, 3, 4, 1], { name: 'test-building', building: 'yes' }),
	way(12, [1, 2, 3, 4, 1]),
	way(13, [5, 6, 7, 8, 5])
);
const relation = bytes(
	4,
	concat(
		uint(1, 20),
		tags({ type: 'multipolygon', landuse: 'forest', name: 'test-area' }),
		packed(8, [sid('outer'), sid('inner')]),
		packed(9, delta([12, 13]), true),
		packed(10, [1, 1])
	)
);
const primitive = group =>
	concat(bytes(1, concat(...strings.map(value => string(1, value)))), bytes(2, group));
const block = (type, payload, compressed) => {
	const blob = compressed
		? concat(uint(2, payload.length), bytes(3, deflateSync(payload)))
		: bytes(1, payload);
	const header = concat(string(1, type), uint(3, blob.length));
	const size = Buffer.alloc(4);
	size.writeUInt32BE(header.length);
	return concat(size, header, blob);
};
const header = dense =>
	concat(string(4, 'OsmSchema-V0.6'), ...(dense ? [string(4, 'DenseNodes')] : []));
for (const dense of [false, true]) {
	const fixture = concat(
		block('OSMHeader', header(dense), dense),
		block('OSMData', primitive(dense ? denseNodes() : nodeMessages()), dense),
		block('OSMData', primitive(ways), dense),
		block('OSMData', primitive(relation), dense)
	);
	writeFileSync(
		new URL(dense ? './test-dense.osm.pbf' : './test-raw.osm.pbf', import.meta.url),
		fixture
	);
	if (dense) {
		const corrupt = Buffer.from(fixture);
		corrupt[corrupt.length - 1] ^= 255;
		writeFileSync(new URL('./test-corrupt.osm.pbf', import.meta.url), corrupt);
	}
}
writeFileSync(
	new URL('./test-empty.osm.pbf', import.meta.url),
	block('OSMHeader', header(false), false)
);
writeFileSync(
	new URL('./test-unsupported.osm.pbf', import.meta.url),
	block('OSMHeader', concat(header(false), string(4, 'test-unsupported-feature')), false)
);

// 同じ架空の四角形を繰り返し、多数のブロック間参照と15万件の出力を検証する。
const spillBlocks = [
	block('OSMHeader', header(true), true),
	block('OSMData', primitive(denseNodes()), true)
];
for (let start = 0; start < 150000; start += 1000) {
	spillBlocks.push(
		block(
			'OSMData',
			primitive(
				concat(
					...Array.from(
						{ length: 1000 },
						(_, i) => way(100 + start + i, [1, 2, 3, 4, 1], { building: 'yes' })
					)
				)
			),
			true
		)
	);
}
writeFileSync(new URL('./test-spill.osm.pbf', import.meta.url), concat(...spillBlocks));

// 専用デコーダーへの切り替えで必要な境界条件。
const save = (name, ...groups) =>
	writeFileSync(
		new URL(`./${name}.osm.pbf`, import.meta.url),
		concat(
			block('OSMHeader', header(true), true),
			...groups.map(group => block('OSMData', primitive(group), true))
		)
	);
save(
	'test-tagless-dense',
	bytes(
		2,
		concat(
			packed(1, [1, 1], true),
			packed(8, [0, 1e7], true),
			packed(9, [0, 1e7], true)
		)
	),
	way(10, [1, 2], { highway: 'path' })
);
save(
	'test-bad-dense-count',
	bytes(
		2,
		concat(
			packed(1, [1, 1], true),
			packed(8, [0], true),
			packed(9, [0, 1e7], true)
		)
	)
);
save(
	'test-bad-dense-tags',
	bytes(
		2,
		concat(
			packed(1, [1], true),
			packed(8, [0], true),
			packed(9, [0], true),
			packed(10, [1, 2])
		)
	)
);
save(
	'test-bad-tag-index',
	bytes(
		1,
		concat(
			uint(1, zigzag(9)),
			packed(2, [999]),
			packed(3, [1]),
			uint(8, 0),
			uint(9, 0)
		)
	)
);
save('test-missing-coordinate', bytes(1, concat(uint(1, zigzag(9)), uint(8, 0))));
save('test-duplicate-id', nodeMessages(), nodeMessages());
save('test-unsafe-id', bytes(1, concat(uint(1, 2n ** 55n), uint(8, 0), uint(9, 0))));
save('test-missing-node', nodeMessages(), way(10, [1, 999, 2], { highway: 'path' }));
save('test-bad-message', concat(Buffer.from([10, 100]), Buffer.from([8, 2])));
const offsetNode = bytes(
	1,
	concat(uint(1, zigzag(9)), tags(pointTags), uint(8, zigzag(2000000)), uint(9, zigzag(3000000)))
);
writeFileSync(
	new URL('./test-offset.osm.pbf', import.meta.url),
	concat(
		block('OSMHeader', header(false), false),
		block(
			'OSMData',
			concat(
				primitive(offsetNode),
				uint(17, 1000),
				uint(19, BigInt.asUintN(64, -1000000000n)),
				uint(20, 1000000000)
			),
			false
		)
	)
);
writeFileSync(
	new URL('./test-history.osm.pbf', import.meta.url),
	block('OSMHeader', concat(header(false), string(4, 'HistoricalInformation')), false)
);
strings.push('route', 'restriction', 'from', 'to', 'via', 'test-route', 'test-restriction');
const rel = (id, attributes, members) =>
	bytes(
		4,
		concat(
			uint(1, id),
			tags(attributes),
			packed(8, members.map(m => sid(m[2]))),
			packed(
				9,
				delta(members.map(m => m[1])),
				true
			),
			packed(10, members.map(m => m[0]))
		)
	);
save(
	'test-relations',
	nodeMessages(),
	ways,
	concat(
		rel(30, { type: 'route', name: 'test-route' }, [[1, 10, '']]),
		rel(31, { type: 'restriction', name: 'test-restriction' }, [
			[1, 10, 'from'],
			[0, 2, 'via'],
			[1, 11, 'to']
		])
	)
);
save('test-relation-cycle', nodeMessages(), rel(30, { type: 'restriction' }, [[2, 30, '']]));
save('test-bad-relation', nodeMessages(), bytes(4, concat(uint(1, 30), packed(9, [10], true))));
// Blobのraw_size検査と圧縮方式の拒否。外枠は正しいままにする。
const invalidBlob = (name, blob) => {
	const h = concat(string(1, 'OSMHeader'), uint(3, blob.length));
	const length = Buffer.alloc(4);
	length.writeUInt32BE(h.length);
	writeFileSync(new URL(`./${name}.osm.pbf`, import.meta.url), concat(length, h, blob));
};
invalidBlob('test-zlib-size', concat(uint(2, 1), bytes(3, deflateSync(header(true)))));
invalidBlob(
	'test-oversize-blob',
	concat(uint(2, 32 * 1024 * 1024), bytes(3, deflateSync(header(true))))
);
invalidBlob('test-lzma', concat(uint(2, 1), bytes(4, Buffer.from([0]))));
