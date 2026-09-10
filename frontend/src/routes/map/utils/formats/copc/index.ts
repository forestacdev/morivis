import { Copc, type Getter, Las } from 'copc';

import { getLasProjection, type LasProjection } from '$routes/map/utils/formats/las';
import { resolveStaticAssetPath } from '$routes/map/utils/platform/asset-path';

type CopcHierarchyNode = {
	key: string;
	pointCount: number;
	pointDataOffset: number;
	pointDataLength: number;
};

type CopcHierarchyPage = {
	key: string;
	pageOffset: number;
	pageLength: number;
};

type CopcCoordinate = [number, number, number];
type CopcColor = [number, number, number];
type CopcLazPerf = Awaited<ReturnType<typeof Las.PointData.createLazPerf>>;

export interface CopcParseResult {
	positions: Float64Array;
	colors?: Uint8Array;
	pointCount: number;
	sourcePointCount: number;
	bbox: [number, number, number, number] | null;
	projection: LasProjection | null;
	isSampled: boolean;
}

export const COPC_MAX_POINTS = 120000;
const COPC_LAZ_PERF_WASM_PATH = resolveStaticAssetPath('/vendor/laz-perf/laz-perf.wasm');

let copcLazPerfPromise: Promise<CopcLazPerf> | null = null;

export const isCopcFileName = (fileName: string): boolean => /\.copc\.laz$/i.test(fileName);

const getCopcLazPerf = (): Promise<CopcLazPerf> => {
	if (!copcLazPerfPromise) {
		copcLazPerfPromise = Las.PointData.createLazPerf({
			locateFile: (path: string) => (path.endsWith('.wasm') ? COPC_LAZ_PERF_WASM_PATH : path)
		}).catch((error) => {
			copcLazPerfPromise = null;
			throw error;
		});
	}

	return copcLazPerfPromise;
};

const createArrayBufferGetter = (arrayBuffer: ArrayBuffer): Getter => async (begin, end) =>
	new Uint8Array(arrayBuffer.slice(begin, end));

const parseCopcKey = (key: string) => {
	const [level = Number.MAX_SAFE_INTEGER, x = 0, y = 0, z = 0] = key.split('-').map((part) => {
		const parsed = Number.parseInt(part, 10);
		return Number.isFinite(parsed) ? parsed : 0;
	});

	return { level, x, y, z };
};

const compareCopcKeys = (leftKey: string, rightKey: string): number => {
	const left = parseCopcKey(leftKey);
	const right = parseCopcKey(rightKey);

	if (left.level !== right.level) return left.level - right.level;
	if (left.x !== right.x) return left.x - right.x;
	if (left.y !== right.y) return left.y - right.y;
	return left.z - right.z;
};

const compareCopcEntries = (
	left: Pick<CopcHierarchyNode | CopcHierarchyPage, 'key'>,
	right: Pick<CopcHierarchyNode | CopcHierarchyPage, 'key'>
) => compareCopcKeys(left.key, right.key);

const toCopcBbox = (min?: number[], max?: number[]): [number, number, number, number] | null => {
	if (!min || !max || min.length < 2 || max.length < 2) return null;

	const bbox: [number, number, number, number] = [min[0], min[1], max[0], max[1]];
	return bbox.every((value) => Number.isFinite(value)) ? bbox : null;
};

const normalizeColorChannel = (value: number): number => {
	const normalized = value > 255 ? Math.round(value / 256) : Math.round(value);
	return Math.max(0, Math.min(255, normalized));
};

const getSampleIndex = (sampleIndex: number, sourceCount: number, targetCount: number): number => {
	if (targetCount >= sourceCount) return sampleIndex;
	return Math.min(sourceCount - 1, Math.floor((sampleIndex * sourceCount) / targetCount));
};

const collectCopcHierarchyNodes = async (
	getter: Getter,
	rootHierarchyPage: { pageOffset: number; pageLength: number; },
	maxPoints: number
): Promise<CopcHierarchyNode[]> => {
	const queue: CopcHierarchyPage[] = [{ key: '0-0-0-0', ...rootHierarchyPage }];
	const visited = new Set<string>();
	const nodes: CopcHierarchyNode[] = [];
	let discoveredPointCount = 0;

	while (queue.length > 0 && discoveredPointCount < maxPoints) {
		queue.sort(compareCopcEntries);
		const currentPage = queue.shift();
		if (!currentPage) break;

		const pageId = `${currentPage.key}:${currentPage.pageOffset}:${currentPage.pageLength}`;
		if (visited.has(pageId)) continue;
		visited.add(pageId);

		const subtree = await Copc.loadHierarchyPage(getter, currentPage);

		const pageNodes = Object.entries(subtree.nodes)
			.filter((entry): entry is [string, Omit<CopcHierarchyNode, 'key'>] => {
				const node = entry[1];
				return !!node && node.pointCount > 0;
			})
			.map(([key, node]) => ({ key, ...node }))
			.sort(compareCopcEntries);

		nodes.push(...pageNodes);
		discoveredPointCount += pageNodes.reduce((sum, node) => sum + node.pointCount, 0);

		const childPages = Object.entries(subtree.pages)
			.filter((entry): entry is [string, Omit<CopcHierarchyPage, 'key'>] => !!entry[1])
			.map(([key, page]) => ({ key, ...page }))
			.sort(compareCopcEntries);

		queue.push(...childPages);
	}

	return nodes.sort(compareCopcEntries);
};

const readCopcNodePoints = async (
	getter: Getter,
	copc: Awaited<ReturnType<typeof Copc.create>>,
	node: CopcHierarchyNode,
	targetCount: number,
	hasColor: boolean,
	lazPerf: CopcLazPerf
): Promise<{ positions: CopcCoordinate[]; colors: CopcColor[] | null; }> => {
	const include = hasColor ? ['X', 'Y', 'Z', 'Red', 'Green', 'Blue'] : ['X', 'Y', 'Z'];
	const view = await Copc.loadPointDataView(getter, copc, node, { include, lazPerf });
	const getX = view.getter('X');
	const getY = view.getter('Y');
	const getZ = view.getter('Z');
	const getRed = hasColor && 'Red' in view.dimensions ? view.getter('Red') : null;
	const getGreen = hasColor && 'Green' in view.dimensions ? view.getter('Green') : null;
	const getBlue = hasColor && 'Blue' in view.dimensions ? view.getter('Blue') : null;

	const positions: CopcCoordinate[] = [];
	const colors: CopcColor[] | null = hasColor ? [] : null;

	for (let sampleIndex = 0; sampleIndex < targetCount; sampleIndex += 1) {
		const pointIndex = getSampleIndex(sampleIndex, node.pointCount, targetCount);
		positions.push([getX(pointIndex), getY(pointIndex), getZ(pointIndex)]);

		if (!colors) continue;

		colors.push([
			normalizeColorChannel(getRed ? getRed(pointIndex) : 255),
			normalizeColorChannel(getGreen ? getGreen(pointIndex) : 255),
			normalizeColorChannel(getBlue ? getBlue(pointIndex) : 255)
		]);
	}

	return { positions, colors };
};

export const parseCopcFile = async (
	file: File,
	maxPoints = COPC_MAX_POINTS
): Promise<CopcParseResult> => {
	const arrayBuffer = await file.arrayBuffer();
	const projection = getLasProjection(arrayBuffer);
	const getter = createArrayBufferGetter(arrayBuffer);
	const copc = await Copc.create(getter);
	const totalPointCount = Math.max(copc.header.pointCount ?? 0, 0);
	const bbox = toCopcBbox(copc.header.min, copc.header.max);
	const nodes = await collectCopcHierarchyNodes(getter, copc.info.rootHierarchyPage, maxPoints);

	if (nodes.length === 0) {
		throw new Error('COPC の点群データが見つかりませんでした');
	}

	const hasColor = copc.header.pointDataRecordFormat === 7
		|| copc.header.pointDataRecordFormat === 8;
	const lazPerf = await getCopcLazPerf();
	const positionValues: number[] = [];
	const colorValues: number[] = [];
	let loadedPointCount = 0;

	for (const node of nodes) {
		if (loadedPointCount >= maxPoints) break;

		const remaining = maxPoints - loadedPointCount;
		const targetCount = Math.min(node.pointCount, remaining);
		if (targetCount <= 0) continue;

		const sampled = await readCopcNodePoints(
			getter,
			copc,
			node,
			targetCount,
			hasColor,
			lazPerf
		);

		for (const [x, y, z] of sampled.positions) {
			positionValues.push(x, y, z);
		}

		if (sampled.colors) {
			for (const [r, g, b] of sampled.colors) {
				colorValues.push(r, g, b);
			}
		}

		loadedPointCount += sampled.positions.length;
	}

	if (loadedPointCount === 0) {
		throw new Error('COPC の点群データが読み込めませんでした');
	}

	return {
		positions: new Float64Array(positionValues),
		colors: hasColor ? new Uint8Array(colorValues) : undefined,
		pointCount: loadedPointCount,
		sourcePointCount: Math.max(totalPointCount, loadedPointCount),
		bbox,
		projection,
		isSampled: loadedPointCount < totalPointCount
	};
};
