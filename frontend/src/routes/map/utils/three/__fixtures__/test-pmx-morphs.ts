/** モーフ付き三角形だけの架空PMX。 */
export const createTestPmxMorphs = () => {
	const bytes: number[] = [];
	const u8 = (...values: number[]) => bytes.push(...values);
	const i32 = (value: number) => {
		const buffer = new ArrayBuffer(4);
		new DataView(buffer).setInt32(0, value, true);
		u8(...new Uint8Array(buffer));
	};
	const f32 = (...values: number[]) => {
		for (const value of values) {
			const buffer = new ArrayBuffer(4);
			new DataView(buffer).setFloat32(0, value, true);
			u8(...new Uint8Array(buffer));
		}
	};
	const text = (value: string) => {
		const encoded = new TextEncoder().encode(value);
		i32(encoded.length);
		u8(...encoded);
	};
	u8(80, 77, 88, 32);
	f32(2);
	u8(8, 1, 0, 1, 1, 1, 1, 1, 1);
	['test-model', '', '', ''].forEach(text);
	i32(3);
	for (const position of [[0, 0, 0], [1, 0, 0], [0, 1, 0]]) {
		f32(...position, 0, 0, 1, 0, 0);
		u8(0, 0); // BDEF1、ボーン 0
		f32(1);
	}
	i32(3);
	u8(0, 1, 2);
	i32(0); // textures
	i32(1);
	text('test-material');
	text('');
	f32(1, 1, 1, 1, 0, 0, 0, 1, 0.5, 0.5, 0.5);
	u8(0);
	f32(0, 0, 0, 1, 1);
	u8(255, 255, 0, 0, 255); // テクスチャなし
	text('');
	i32(3);
	i32(1);
	text('test-bone');
	text('');
	f32(0, 0, 0);
	u8(255);
	i32(0);
	u8(0, 0);
	f32(0, 1, 0);
	i32(3); // morphs
	text('test-vertex');
	text('test-vertex-en');
	u8(2, 1);
	i32(1);
	u8(0);
	f32(1, 0, 0);
	text('test-bone-morph');
	text('');
	u8(1, 2);
	i32(1);
	u8(0);
	f32(0, 2, 0, 0, 0, 0, 1);
	text('test-group');
	text('');
	u8(4, 0);
	i32(2);
	u8(0);
	f32(0.5);
	u8(1);
	f32(0.25);
	for (let i = 0; i < 3; i++) i32(0); // 表示枠、剛体、joint
	return new Uint8Array(bytes);
};
