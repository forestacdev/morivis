import { aisLimits } from './definition';

export interface AisSentence {
	identifier: string;
	count: number;
	number: number;
	sequence: string;
	channel: string;
	payload: string;
	fill: number;
	source: string;
	group: string;
	time?: string;
	timeSource?: string;
}

const checksum = (body: string, expected: string) => {
	const actual = [...body].reduce((value, char) => value ^ char.charCodeAt(0), 0);
	if (actual !== Number.parseInt(expected, 16)) throw new Error('チェックサムが一致しません');
};

const timestamp = (raw: string): string | undefined => {
	if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(raw)) return;
	// Date.parseが2月30日などを繰り上げないよう日付を別途検証する。
	const [year, month, day] = raw.slice(0, 10).split('-').map(Number);
	const check = new Date(0);
	check.setUTCFullYear(year, month - 1, day);
	if (check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) return;
	const value = Date.parse(raw);
	return Number.isFinite(value) ? new Date(value).toISOString() : undefined;
};

/** NMEA外枠と受信時刻だけを処理する。AISペイロードの復号はライブラリへ渡す。 */
export const parseAisSentence = (line: string): AisSentence | null => {
	const position = line.search(/![A-Z0-9]{2}VD[MO],/);
	if (position < 0) return null;
	if (line.length > aisLimits.maxLineLength) throw new Error('AISの1行が長すぎます');
	const match =
		/^!([A-Z0-9]{2}VD[MO],[1-9],[1-9],[0-9]?,[AB12]?,[0-W`-w]+,[0-5])\*([\da-f]{2})\s*$/i.exec(
			line.slice(position)
		);
	if (!match) throw new Error('AISセンテンスが不正です');
	checksum(match[1], match[2]);
	const [identifier, count, number, sequence, channel, payload, fill] = match[1].split(',');
	const sentence: AisSentence = {
		identifier,
		count: Number(count),
		number: Number(number),
		sequence,
		channel,
		payload,
		fill: Number(fill),
		source: '',
		group: ''
	};
	if (
		sentence.number > sentence.count
		|| (sentence.number < sentence.count && sentence.fill !== 0)
	) {
		throw new Error('AIS断片番号または埋め草ビットが不正です');
	}
	const prefix = line.slice(0, position).trim();
	const tags = [...prefix.matchAll(/\\([^\\]*)\\/g)];
	for (const tag of tags) {
		const block = /^(.*)\*([\da-f]{2})$/i.exec(tag[1]);
		if (!block) throw new Error('タグブロックが不正です');
		checksum(block[1], block[2]);
		for (const field of block[1].split(',')) {
			const colon = field.indexOf(':');
			const key = field.slice(0, colon), value = field.slice(colon + 1);
			if (key === 's') sentence.source = value;
			if (key === 'g') {
				const group = /^(\d+)-(\d+)-(.+)$/.exec(value);
				if (
					!group || Number(group[1]) !== sentence.number
					|| Number(group[2]) !== sentence.count
				) {
					throw new Error('タグの断片番号が一致しません');
				}
				sentence.group = group[3];
			}
			if (key === 'c') {
				// NMEAタグのcはUnix秒。13桁のミリ秒もログ配信側の慣習として扱う。
				if (!/^\d{10}(?:\.\d+)?$|^\d{13}$/.test(value)) {
					throw new Error('受信時刻が不正です');
				}
				const time = Number(value)
					* (value.length === 13 && !value.includes('.') ? 1 : 1000);
				sentence.time = new Date(time).toISOString();
				sentence.timeSource = 'tagblock';
			}
		}
	}
	const remaining = prefix.replace(/\\[^\\]*\\/g, '').trim().replace(/^\[|\]$|,$/g, '').trim();
	if (remaining.includes('\\')) throw new Error('タグブロックが不正です');
	if (remaining && !sentence.time) {
		sentence.time = timestamp(remaining);
		if (sentence.time) sentence.timeSource = 'log-prefix';
	}
	if (prefix.includes('\\') && !tags.length) throw new Error('タグブロックが不正です');
	return sentence;
};
