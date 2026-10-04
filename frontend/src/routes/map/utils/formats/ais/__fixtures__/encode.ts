// 架空ログを生成するテスト専用の最小エンコーダー。外部AISデータを使わない。
const alphabet = '@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_ !"#$%&\'()*+,-./0123456789:;<=>?';
const bits = (size: number, type: number, mmsi: number) => {
	const data = Array<number>(size).fill(0);
	const number = (offset: number, length: number, value: number) => {
		const encoded = (value < 0 ? 2 ** length + value : value).toString(2).padStart(length, '0');
		for (let i = 0; i < length; i++) data[offset + i] = Number(encoded[i]);
	};
	const text = (offset: number, length: number, value: string) => {
		for (let i = 0; i < length / 6; i++) {
			number(offset + i * 6, 6, alphabet.indexOf(value[i] ?? '@'));
		}
	};
	number(0, 6, type);
	number(8, 30, mmsi);
	const payload = () => {
		const fill = (6 - data.length % 6) % 6;
		const padded = [...data, ...Array<number>(fill).fill(0)].join('');
		let value = '';
		for (let i = 0; i < padded.length; i += 6) {
			const code = Number.parseInt(padded.slice(i, i + 6), 2);
			value += String.fromCharCode(code + (code < 40 ? 48 : 56));
		}
		return { value, fill };
	};
	return { number, text, payload };
};
export const checksum = (body: string) =>
	[...body].reduce((n, c) => n ^ c.charCodeAt(0), 0).toString(16).toUpperCase().padStart(2, '0');
export const sentence = (
	payload: string,
	fill = 0,
	count = 1,
	part = 1,
	sequence = '',
	channel = 'A',
	identifier = 'AIVDM'
) => {
	const body = `${identifier},${count},${part},${sequence},${channel},${payload},${fill}`;
	return `!${body}*${checksum(body)}`;
};
export const tag = (body: string, line: string) => `\\${body}*${checksum(body)}\\${line}`;
export const position = (
	options: {
		type?: number;
		mmsi?: number;
		lon?: number;
		lat?: number;
		speed?: number;
		heading?: number;
		course?: number;
		second?: number;
	} = {}
) => {
	const {
		type = 1,
		mmsi = 999000001,
		lon = 2,
		lat = 1,
		speed = 50,
		heading = 90,
		course = 900,
		second = 0
	} = options;
	const data = bits(168, type, mmsi);
	const shift = type === 18 ? -4 : 0;
	data.number(50 + shift, 10, speed);
	data.number(61 + shift, 28, Math.round(lon * 600000));
	data.number(89 + shift, 27, Math.round(lat * 600000));
	data.number(116 + shift, 12, course);
	data.number(128 + shift, 9, heading);
	data.number(137 + shift, 6, second);
	return sentence(data.payload().value);
};
export const static5 = (mmsi = 999000001, name = 'TEST-VESSEL', sequence = '1', channel = 'A') => {
	const data = bits(424, 5, mmsi);
	data.text(70, 42, 'TEST');
	data.text(112, 120, name);
	data.number(232, 8, 70);
	data.number(294, 8, 15);
	data.text(302, 120, 'TEST-PORT');
	const { value, fill } = data.payload();
	return [
		sentence(value.slice(0, 60), 0, 2, 1, sequence, channel),
		sentence(value.slice(60), fill, 2, 2, sequence, channel)
	];
};
export const static24 = (part: number, mmsi = 999000002) => {
	const data = bits(part === 0 ? 160 : 168, 24, mmsi);
	data.number(38, 2, part);
	if (part === 0) data.text(40, 120, 'TEST-BOAT');
	else {
		data.number(40, 8, 37);
		data.text(90, 42, 'TEST-B');
	}
	const { value, fill } = data.payload();
	return sentence(value, fill);
};
