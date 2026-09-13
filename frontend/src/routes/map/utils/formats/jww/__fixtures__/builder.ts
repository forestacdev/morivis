// Hand-authored, synthetic JWW archives. No drawing/sample files are used by tests.
export interface TestEntity {
	kind:
		| 'Sen'
		| 'Enko'
		| 'Ten'
		| 'Moji'
		| 'Solid'
		| 'Sunpou'
		| 'Block'
		| 'List'
		| 'reference'
		| 'Unknown';
	values?: number[];
	group?: number;
	layer?: number;
	penStyle?: number;
	penColor?: number;
	color?: number;
	text?: string;
	children?: TestEntity[];
	id?: number;
	time64?: boolean;
}

export const createTestWriter = () => {
	const bytes: number[] = [];
	const raw = (data: Uint8Array | number[]) => {
		for (const byte of data) bytes.push(byte);
	};
	const zeros = (count: number) => {
		for (let i = 0; i < count; i++) bytes.push(0);
	};
	const number = (size: number, value: number, float = false) => {
		const data = new DataView(new ArrayBuffer(size));
		if (float) data.setFloat64(0, value, true);
		else if (size === 1) data.setUint8(0, value);
		else if (size === 2) data.setUint16(0, value, true);
		else data.setUint32(0, value, true);
		raw(new Uint8Array(data.buffer));
	};
	const u16 = (value: number) => number(2, value);
	const u32 = (value: number) => number(4, value);
	const doubles = (...values: number[]) => values.forEach(value => number(8, value, true));
	const string = (value: string) => {
		// Write Unicode CString, including extended-length encoding.
		raw([0xff, 0xfe, 0xff]);
		if (value.length < 255) number(1, value.length);
		else {
			number(1, 255);
			u16(value.length);
		}
		for (let i = 0; i < value.length; i++) u16(value.charCodeAt(i));
	};
	return {
		raw,
		zeros,
		number,
		u16,
		u32,
		doubles,
		string,
		finish: () => new Uint8Array(bytes).buffer
	};
};

export const jwwFixture = ({
	version = 700,
	entities = [],
	blocks = [],
	scales = [50, 100],
	hiddenGroup = -1,
	images = false,
	longTags = false
}: {
	version?: number;
	entities?: TestEntity[];
	blocks?: TestEntity[];
	scales?: number[];
	hiddenGroup?: number;
	images?: boolean;
	longTags?: boolean;
} = {}) => {
	const w = createTestWriter();
	w.raw(new TextEncoder().encode('JwwData.'));
	w.u32(version);
	w.string('test-memo');
	w.u32(3);
	w.u32(0);
	for (let group = 0; group < 16; group++) {
		w.u32(group === hiddenGroup ? 0 : 2);
		w.u32(0);
		w.doubles(scales[group] ?? 1);
		w.u32(0);
		for (let layer = 0; layer < 16; layer++) {
			w.u32(2);
			w.u32(0);
		}
	}
	w.zeros(14 * 4); // dummy
	w.zeros(5 * 4); // dimension preferences
	w.zeros(2 * 4); // dummy, line width
	w.doubles(0, 0, 1); // print origin/scale
	w.zeros(2 * 4);
	w.doubles(1, 1, 1, 0, 0); // ruler
	for (let g = 0; g < 16; g++) for (let l = 0; l < 16; l++) w.string(`test-layer-${g}-${l}`);
	for (let g = 0; g < 16; g++) w.string(`test-group-${g}`);
	w.doubles(0, 0);
	w.u32(0);
	w.doubles(0); // shadows
	if (version >= 300) w.doubles(0, 0); // sky
	w.u32(0);
	w.doubles(1, 0, 0, 1, 0, 0);
	for (let i = 0; i < (version >= 300 ? 8 : 4); i++) {
		w.doubles(1, 0, 0);
		if (version >= 300) w.u32(0);
	}
	if (version >= 300) {
		w.doubles(0, 0, 0);
		w.u32(0);
		w.doubles(0, 0, 0);
		w.u32(0);
	}
	w.zeros(11 * 8);
	for (let i = 0; i < 10; i++) {
		w.u32(i === 1 ? 0x332211 : 0);
		w.u32(1);
	}
	w.zeros(10 * 16);
	w.zeros(8 * 16);
	w.zeros(5 * 20);
	w.zeros(4 * 16);
	w.zeros(11 * 4);
	if (version >= 223) {
		w.zeros(5 * 4);
		w.zeros(5 * 8);
	}
	if (version >= 225) w.zeros(4 * 8);
	if (version >= 230) w.zeros(2 * 4);
	if (version >= 420) {
		for (let i = 0; i <= 256; i++) {
			w.u32(0x665544);
			w.u32(1);
		}
		for (let i = 0; i <= 256; i++) {
			w.string('test-color');
			w.zeros(16);
		}
		w.zeros(33 * 16);
		for (let i = 0; i <= 32; i++) {
			w.string('test-line');
			w.zeros(4 + 10 * 8);
		}
	}
	w.zeros(10 * 28);
	w.zeros(3 * 8 + 2 * 4);
	w.zeros(2 * 8 + 4 + 6 * 8);
	const classes = new Map<string, number>();
	let nextIndex = 1;
	const body = (e: TestEntity) => {
		w.u32(0);
		w.number(1, e.penStyle ?? 1);
		w.u16(e.penColor ?? 1);
		if (version >= 351) w.u16(1);
		w.u16(e.layer ?? 0);
		w.u16(e.group ?? 0);
		w.u16(0);
		const v = e.values ?? [];
		switch (e.kind) {
			case 'Sen':
				w.doubles(...v);
				break;
			case 'Enko':
				w.doubles(...v.slice(0, 7));
				w.u32(v[7]);
				break;
			case 'Ten':
				w.doubles(...v.slice(0, 2));
				w.u32(v[2] ?? 0);
				if (e.penStyle === 100) {
					w.u32(v[3]);
					w.doubles(v[4], v[5]);
				}
				break;
			case 'Moji':
				w.doubles(...v.slice(0, 4));
				w.u32(1);
				w.doubles(2, 3, 0.5, 0);
				w.string('test-font');
				w.string(e.text ?? 'test-text');
				break;
			case 'Solid':
				w.doubles(...v);
				if (e.penColor === 10) w.u32(e.color ?? 0);
				break;
			case 'Block':
				w.doubles(...v);
				w.u32(e.id ?? 1);
				break;
			case 'List':
				w.u32(e.id ?? 1);
				w.u32(1);
				w.u32(e.time64 ? 0x8000000a : 0);
				if (e.time64) w.zeros(8);
				w.string(e.text ?? 'test-block');
				list(e.children ?? []);
				break;
			case 'Sunpou':
				body({ kind: 'Sen', values: [0, 0, 10, 0] });
				body({ kind: 'Moji', values: [2, 1, 4, 1], text: 'test-dimension' });
				if (version >= 420) {
					w.u16(v[0] ?? 0);
					for (let i = 0; i < 2; i++) {
						body({ kind: 'Sen', values: [i * 10, 0, i * 10, 5] });
					}
					for (let i = 0; i < 4; i++) body({ kind: 'Ten', values: [i, 0, 0] });
				}
				break;
		}
	};
	const list = (items: TestEntity[]) => {
		w.u16(items.length);
		for (const item of items) {
			if (item.kind === 'reference') {
				w.u16(item.id ?? 0);
				continue;
			}
			const name = `CData${item.kind}`;
			const index = classes.get(name);
			if (index) {
				if (longTags) {
					w.u16(0x7fff);
					w.u32(0x80000000 + index);
				} else w.u16(0x8000 + index);
			} else {
				classes.set(name, nextIndex++);
				w.u16(0xffff);
				w.u16(700); // deliberately independent of file version
				const ascii = new TextEncoder().encode(name);
				w.u16(ascii.length);
				w.raw(ascii);
			}
			nextIndex++;
			body(item);
		}
	};
	list(entities);
	list(blocks);
	if (version >= 700) {
		w.u32(images ? 1 : 0);
		if (images) {
			w.string('test-image.bmp.gz');
			w.u32(3);
			w.raw([1, 2, 3]);
		}
	}
	return w.finish();
};
