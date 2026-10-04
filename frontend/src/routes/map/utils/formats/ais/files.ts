import { hasFormatExtension } from '../format-definition';
import { formatAis } from './definition';

export const isAisCandidate = (file: File) => hasFormatExtension(file.name, formatAis.extensions);
export const isAisFile = async (file: File): Promise<boolean> => {
	if (/\.ais$/i.test(file.name)) return true;
	if (!isAisCandidate(file)) return false;
	try {
		const header = await file.slice(0, 16384).text();
		return /![A-Z0-9]{2}VD[MO],[1-9],[1-9],/.test(header);
	} catch {
		return false;
	}
};
