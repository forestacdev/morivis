export interface DmZoneResolution {
	zone: number | null;
	source: 'dmi' | 'index' | 'drawing' | null;
	warning: string | null;
}

const validZone = (zone: number | null): zone is number =>
	zone !== null && Number.isInteger(zone) && zone >= 1 && zone <= 19;

// 任意の識別番号の先頭2桁を系番号として扱わない。
export const zoneFromDrawingId = (drawingId: string): number | null => {
	const match = drawingId.trim().match(
		/^(0[1-9]|1[0-9])[A-Z]{2}\d{2}(?:[1-4]|[0-4][A-E]|\d{2}|[A-T]{2})?$/
	);
	return match ? Number(match[1]) : null;
};

export const resolveDmZone = (
	dmiZones: Array<number | null>,
	indexZones: Array<number | null>,
	drawingIds: string[]
): DmZoneResolution => {
	const sources = [
		{ source: 'dmi' as const, zones: dmiZones },
		{ source: 'index' as const, zones: indexZones },
		{ source: 'drawing' as const, zones: drawingIds.filter(Boolean).map(zoneFromDrawingId) }
	];
	for (const { source, zones } of sources) {
		const valid = [...new Set(zones.filter(validZone))];
		if (valid.length > 1) {
			return {
				zone: null,
				source: null,
				warning: '複数の系番号が含まれるため、座標系を確認してください。'
			};
		}
		if (valid.length === 1 && (source !== 'drawing' || zones.every(validZone))) {
			return { zone: valid[0], source, warning: null };
		}
	}
	return { zone: null, source: null, warning: null };
};

const getPath = (file: File): string =>
	((file as File & { morivisRelativePath?: string; }).morivisRelativePath
		|| file.webkitRelativePath || file.name)
		.replaceAll('\\', '/');

export const getDmFiles = (files: File[]): File[] => files.filter(file => /\.dm$/i.test(file.name));

export const findDmIndexFiles = (file: File, files: File[]): File[] => {
	const path = getPath(file);
	const directory = path.slice(0, path.lastIndexOf('/') + 1);
	return files.filter(candidate => {
		const candidatePath = getPath(candidate);
		return /\.dmi$/i.test(candidatePath)
			&& candidatePath.slice(0, candidatePath.lastIndexOf('/') + 1) === directory;
	});
};
