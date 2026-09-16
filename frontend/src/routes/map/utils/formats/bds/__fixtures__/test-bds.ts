/** 手作業で構成する架空BDS。実ファイルの抜粋は使用しない。 */
class Writer {
	bytes: number[] = [];
	lastMarker = 0;
	classes = new Map<number, number>();
	strings = new Map<string, number>();
	push = (bytes: number[]) => {
		for (const byte of bytes) this.bytes.push(byte);
	};
	number = (value: number, size: 1 | 2 | 4 | 8) => {
		const buffer = new ArrayBuffer(size);
		const view = new DataView(buffer);
		if (size === 8) view.setFloat64(0, value, true);
		else if (size === 4) view.setUint32(0, value, true);
		else if (size === 2) view.setUint16(0, value, true);
		else view.setUint8(0, value);
		this.push([...new Uint8Array(buffer)]);
	};
	compact = (value: number) => {
		while (value >= 128) {
			this.bytes.push(value % 128);
			value = Math.floor(value / 128);
		}
		this.bytes.push(value | 128);
	};
	marker = (kind: number) => {
		const start = this.bytes.length;
		this.bytes.push(kind);
		this.compact(start - this.lastMarker);
		this.lastMarker = start;
	};
	ref = (type: number, version: number) => {
		if (this.classes.has(type)) {
			this.number(this.classes.get(type)!, 2);
			return;
		}
		const id = this.classes.size + 1;
		this.classes.set(type, id);
		this.number(id, 2);
		this.marker(1);
		this.number(type, 4);
		this.number(version, 2);
	};
	base = (type: number, version: number) => {
		if (!this.classes.has(type)) this.ref(type, version);
	};
	string = (value: string) => {
		this.compact(value.length);
		for (let i = 0; i < value.length; i++) this.number(value.charCodeAt(i), 2);
	};
	intern = (value: string) => {
		if (this.strings.has(value)) {
			this.number(this.strings.get(value)!, 4);
			return;
		}
		const id = this.strings.size;
		this.strings.set(value, id);
		this.number(id, 4);
		this.marker(0);
		this.string(value);
	};
	doubles = (...values: number[]) => {
		values.forEach(v => this.number(v, 8));
	};
	end = (flag: number) => {
		this.marker(2);
		this.number(flag, 1);
	};
	common = (attributes = false) => {
		this.base(-172, 6);
		this.number(attributes ? 1 : 0, 1);
		if (attributes) {
			this.number(3, 4);
			for (
				const [type, name, value] of [[-7, 'test-name$', 'test-日本語🌲'], [
					-6,
					'test-count&',
					7
				], [-5, 'test-size#', 2.5]] as const
			) {
				this.ref(type, 0);
				this.base(-4, 0);
				this.number(-1, 4);
				this.intern(name);
				if (typeof value === 'string') this.string(value);
				else this.number(value, type === -6 ? 4 : 8);
				this.end(1);
			}
		}
		this.number(0, 1);
		this.string('');
	};
	line = (badBounds = false) => {
		this.ref(-275, 1);
		this.base(-302, 0);
		this.number(3, 4);
		this.doubles(badBounds ? 9 : 0, 0, 4, 2, 0, 0, 4, 0, 4, 2);
		this.end(1);
	};
	polygon = (attributes: boolean, badBounds: boolean, curve: boolean, multipart: boolean) => {
		this.ref(-149, 8);
		this.common(attributes);
		this.number(multipart ? 2 : 1, 4);
		if (curve) {
			this.ref(-69, 0);
			this.base(-377, 1);
			this.doubles(0, 0, 0, 4, 2, 0);
			this.number(1, 4);
			this.ref(-11, 0);
			this.doubles(0, 0, 0, 1, 2, 0, 3, 2, 0, 4, 0, 0);
			this.end(2);
			this.end(1);
		} else this.line(badBounds);
		if (multipart) this.line();
		this.doubles(2, 1, 0);
		this.end(0);
	};
}
export const createTestBds = (options: {
	empty?: boolean;
	unknown?: boolean;
	badBounds?: boolean;
	curve?: boolean;
	multipart?: boolean;
	group?: boolean;
	definitions?: boolean;
	badDatum?: boolean;
	textMode?: 0 | 1;
} = {}): ArrayBuffer => {
	const w = new Writer();
	w.number(0, 4);
	w.number(41, 2);
	w.ref(-373, 5);
	w.string('');
	w.ref(-120, 3);
	w.base(-105, 1);
	w.base(-301, 2);
	w.doubles(0, 0, 0, 0);
	w.base(-245, 1);
	w.doubles(6378137, 6356752.314140356, 0, 0, 0, 0, 0, 0, 0, 0);
	w.number(options.badDatum ? 0 : 6612, 2);
	w.end(1);
	w.ref(-354, 0);
	w.doubles(1, 0, 0, 0, 0.9999);
	w.end(0);
	w.doubles(100);
	w.number(options.definitions ? 2 : 1, 4);
	if (options.definitions) {
		w.ref(-12, 0);
		w.number(0, 4);
		w.number(1, 4);
		w.number(0, 1);
		w.number(1, 4);
		w.polygon(false, false, false, false);
		w.string('test-definition');
		w.end(0);
	}
	w.number(options.empty ? 1 : 3, 4);
	w.number(0, 2); // 削除済みスロット
	if (!options.empty) {
		if (options.unknown) w.ref(-999, 0);
		if (options.group) {
			w.ref(-324, 0);
			w.common(true);
			w.base(-374, 0);
			w.number(1, 4);
		}
		w.polygon(!options.group, !!options.badBounds, !!options.curve, !!options.multipart);
		if (options.group) {
			w.base(-327, 1);
			w.number(0, 1);
			w.end(0);
		}
		w.ref(-153, 4);
		w.common();
		w.number(options.textMode ?? 0, 1);
		if (options.textMode === 1) w.doubles(1, 0, 0, 1, 2, 3, 1);
		else w.doubles(2, 3, 0);
		w.string('test-label');
		w.doubles(1);
		w.end(0);
	}
	w.number(0x00400000, 4);
	w.string('test-layer');
	w.number(0, 4);
	w.ref(-240, 0);
	w.number(0x4b52414d, 4);
	w.number(w.lastMarker, 4);
	return new Uint8Array(w.bytes).buffer;
};
