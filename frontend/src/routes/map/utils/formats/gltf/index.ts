export interface GltfFileInspectionResult {
	externalBufferUris: string[];
	externalImageUris: string[];
}

type GltfLike = {
	buffers?: Array<{ uri?: unknown; }>;
	images?: Array<{ uri?: unknown; }>;
};

const hasAbsoluteUriScheme = (value: string) => /^[a-z][a-z0-9+.-]*:/i.test(value);

const isExternalLocalUri = (value: unknown): value is string => {
	if (typeof value !== 'string') return false;

	const normalizedValue = value.trim();
	if (!normalizedValue) return false;
	if (normalizedValue.startsWith('data:')) return false;
	if (normalizedValue.startsWith('//')) return false;
	if (hasAbsoluteUriScheme(normalizedValue)) return false;
	return true;
};

const collectExternalUris = (items: Array<{ uri?: unknown; }> | undefined): string[] => {
	const externalUris = new Set<string>();

	for (const item of items ?? []) {
		if (!isExternalLocalUri(item.uri)) continue;
		externalUris.add(item.uri);
	}

	return [...externalUris];
};

export const inspectGltfFile = async (file: File): Promise<GltfFileInspectionResult> => {
	const text = await file.text();

	let parsed: GltfLike;
	try {
		parsed = JSON.parse(text) as GltfLike;
	} catch (error) {
		throw new Error(
			`glTF JSON を解釈できません: ${error instanceof Error ? error.message : String(error)}`
		);
	}

	return {
		externalBufferUris: collectExternalUris(parsed.buffers),
		externalImageUris: collectExternalUris(parsed.images)
	};
};
