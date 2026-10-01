export interface VideoLocation {
	longitude: number;
	latitude: number;
	altitude?: number;
}

/** QuickTimeのISO 6709（度の十進表記）。推測した座標は返さない。 */
export const parseVideoLocation = (value: string): VideoLocation | null => {
	const match = /^([+-]\d{2}(?:\.\d+)?)([+-]\d{3}(?:\.\d+)?)([+-]\d+(?:\.\d+)?)?\/$/.exec(
		value.replace(/\0+$/, '').trim()
	);
	if (!match) return null;
	const latitude = Number(match[1]);
	const longitude = Number(match[2]);
	const altitude = match[3] === undefined ? undefined : Number(match[3]);
	if (
		Math.abs(latitude) > 90 || Math.abs(longitude) > 180
		|| (altitude !== undefined && !Number.isFinite(altitude))
	) return null;
	return { latitude, longitude, ...(altitude !== undefined && { altitude }) };
};

interface Atom {
	type: string;
	index: number;
	start: number;
	end: number;
}
const decoder = new TextDecoder();
const LOCATION_KEYS = new Set(['com.apple.quicktime.location.ISO6709', 'location']);

/** moovの位置タグだけを読む。mdat（映像本体）はサイズを使って読み飛ばす。 */
export const readVideoLocation = async (
	file: Blob,
	signal: AbortSignal
): Promise<VideoLocation | null> => {
	signal.throwIfAborted();
	let atomCount = 0;
	let bytesRead = 0;
	const read = async (start: number, size: number): Promise<Uint8Array> => {
		signal.throwIfAborted();
		bytesRead += size;
		if (bytesRead > 1024 * 1024) throw new RangeError('Video metadata limit');
		const bytes = new Uint8Array(await file.slice(start, start + size).arrayBuffer());
		signal.throwIfAborted();
		return bytes;
	};
	const atoms = async (start: number, end: number): Promise<Atom[]> => {
		const result: Atom[] = [];
		for (let offset = start; offset + 8 <= end;) {
			if (++atomCount > 4096) throw new RangeError('Video atom limit');
			const header = await read(offset, Math.min(16, end - offset));
			const view = new DataView(header.buffer);
			let size = view.getUint32(0);
			let headerSize = 8;
			if (size === 1) {
				if (header.length < 16) break;
				size = Number(view.getBigUint64(8));
				headerSize = 16;
			} else if (size === 0) size = end - offset;
			if (!Number.isSafeInteger(size) || size < headerSize || size > end - offset) break;
			result.push({
				type: String.fromCharCode(...header.subarray(4, 8)),
				index: view.getUint32(4),
				start: offset + headerSize,
				end: offset + size
			});
			offset += size;
		}
		return result;
	};
	const readText = async (atom: Atom, skip: number): Promise<VideoLocation | null> => {
		const size = atom.end - atom.start - skip;
		if (size <= 0 || size > 1024) return null;
		return parseVideoLocation(decoder.decode(await read(atom.start + skip, size)));
	};
	const readMeta = async (meta: Atom): Promise<VideoLocation | null> => {
		if (meta.end - meta.start < 8) return null;
		// ISO meta has version/flags; QuickTime meta begins directly with its children.
		const prefix = new DataView((await read(meta.start, 4)).buffer).getUint32(0);
		const children = await atoms(meta.start + (prefix === 0 ? 4 : 0), meta.end);
		const keysAtom = children.find(atom => atom.type === 'keys');
		const list = children.find(atom => atom.type === 'ilst');
		if (!list) return null;
		const indices = new Set<number>();
		if (keysAtom && keysAtom.end - keysAtom.start >= 8) {
			const bytes = await read(keysAtom.start, keysAtom.end - keysAtom.start);
			const view = new DataView(bytes.buffer);
			const count = view.getUint32(4);
			for (let index = 1, offset = 8; index <= count && offset + 8 <= bytes.length; index++) {
				const size = view.getUint32(offset);
				if (size < 8 || size > bytes.length - offset) break;
				if (
					decoder.decode(bytes.subarray(offset + 4, offset + 8)) === 'mdta'
					&& LOCATION_KEYS.has(decoder.decode(bytes.subarray(offset + 8, offset + size)))
				) {
					indices.add(index);
				}
				offset += size;
			}
		}
		for (const item of await atoms(list.start, list.end)) {
			if (!indices.has(item.index) && item.type !== '©xyz') continue;
			for (const data of await atoms(item.start, item.end)) {
				if (data.type !== 'data' || data.end - data.start < 8) continue;
				const type = new DataView((await read(data.start, 4)).buffer).getUint32(0);
				if (type !== 1) continue; // UTF-8
				const location = await readText(data, 8);
				if (location) return location;
			}
		}
		return null;
	};
	try {
		const top = await atoms(0, file.size);
		for (const moov of top.filter(atom => atom.type === 'moov')) {
			const children = await atoms(moov.start, moov.end);
			const candidates = [...children];
			for (const udta of children.filter(atom => atom.type === 'udta')) {
				candidates.push(...await atoms(udta.start, udta.end));
			}
			// Prefer modern metadata over the legacy user-data tag.
			for (const meta of candidates.filter(atom => atom.type === 'meta')) {
				const location = await readMeta(meta);
				if (location) return location;
			}
			for (const xyz of candidates.filter(atom => atom.type === '©xyz')) {
				const location = await readText(xyz, 4); // text length + language
				if (location) return location;
			}
			// 3GPP location: version/flags, language, name\0, role, signed 16.16 coordinates.
			for (const loci of candidates.filter(atom => atom.type === 'loci')) {
				if (loci.end - loci.start < 20 || loci.end - loci.start > 4096) continue;
				const bytes = await read(loci.start, loci.end - loci.start);
				const view = new DataView(bytes.buffer);
				if (view.getUint32(0) !== 0) continue;
				const nameEnd = bytes.indexOf(0, 6);
				if (nameEnd < 0 || nameEnd + 14 > bytes.length) continue;
				const longitude = view.getInt32(nameEnd + 2) / 65536;
				const latitude = view.getInt32(nameEnd + 6) / 65536;
				const altitude = view.getInt32(nameEnd + 10) / 65536;
				if (Math.abs(longitude) <= 180 && Math.abs(latitude) <= 90) {
					return { longitude, latitude, altitude };
				}
			}
		}
		return null;
	} catch (error) {
		signal.throwIfAborted();
		if (error instanceof RangeError) return null;
		throw error;
	}
};
