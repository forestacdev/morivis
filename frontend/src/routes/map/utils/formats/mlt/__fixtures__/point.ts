/** MLT v1の人工タイル。点(10,20)を1件、UINT32属性test-value=7を持つ。 */
export const createPointTile = () => {
	const body = [
		1, // embedded metadata block
		10,
		...new TextEncoder().encode('test-layer'),
		128,
		32, // extent 4096
		2,
		4, // 2 columns, geometry
		18,
		10,
		...new TextEncoder().encode('test-value'), // UINT32 property
		2, // geometry stream count
		16,
		2,
		1,
		1,
		0, // geometry type: POINT, plain varint
		19,
		2,
		2,
		2,
		20,
		40, // vertex stream: zigzag(10), zigzag(20)
		16,
		2,
		1,
		1,
		7 // property stream
	];
	return new Uint8Array([body.length, ...body]);
};
