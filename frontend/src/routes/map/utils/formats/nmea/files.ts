import { formatNmea } from './definition';

export const isNmeaFile = async (file: File): Promise<boolean> => {
	if (/\.(?:nmea|nme)$/i.test(file.name)) return true;
	if (!/\.(?:log|txt)$/i.test(file.name)) return false;
	// 汎用テキストは先頭だけを検査。点群TXTやGTFSを拡張子だけで奪わない。
	try {
		const header = await file.slice(0, Math.min(file.size, 16_384)).text();
		return /(?:^|[\r\n])\s*\$[A-Z0-9]{2}(?:RMC|GGA|GLL|GNS|GSA|GSV|ZDA|VTG|DTM),/.test(header);
	} catch {
		return false;
	}
};

export const isNmeaCandidate = (file: File): boolean =>
	formatNmea.extensions.some(extension => file.name.toLowerCase().endsWith(extension));
