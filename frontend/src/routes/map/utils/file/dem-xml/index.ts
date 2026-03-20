/**
 * 基盤地図情報 DEM XML パーサー
 * xml-dem-viewer (https://github.com/forestacdev/xml-dem-viewer) を移植
 *
 * XMLファイル（単体/複数/ZIP）を並列Workerでパースし、
 * 標高データのFloat32Array + bboxを返す
 */
import JSZip from 'jszip';

// ============================
// 型定義
// ============================

interface MetaData {
	mesh_code: number;
	lower_corner: { lat: number; lon: number };
	upper_corner: { lat: number; lon: number };
	grid_length: { x: number; y: number };
	start_point: { x: number; y: number };
	pixel_size: { x: number; y: number };
}

interface DemContent {
	mesh_code: number;
	meta_data: MetaData;
	elevation: { mesh_code: number; items: string[] };
}

interface NpArrayData {
	mesh_code: number;
	array: number[][];
}

export interface DemXmlResult {
	/** 標高データ（左上から右下、nodataは-9999） */
	data: Float32Array;
	width: number;
	height: number;
	/** WGS84 bbox [minLon, minLat, maxLon, maxLat] */
	bbox: [number, number, number, number];
	nodata: number;
}

// ============================
// 並列XMLパーサー
// ============================

class ParallelXmlParser {
	private workers: Worker[] = [];
	private readonly maxWorkers = 4;
	private isTerminated = false;

	constructor() {
		for (let i = 0; i < this.maxWorkers; i++) {
			const worker = new Worker(new URL('./xml-parser.worker.ts', import.meta.url), {
				type: 'module'
			});
			this.workers.push(worker);
		}
	}

	async parseXmlFiles(xmlTexts: string[], seaAtZero: boolean = false): Promise<DemContent[]> {
		if (this.isTerminated) throw new Error('Parser has been terminated');

		return new Promise((resolve, reject) => {
			const results: DemContent[] = new Array(xmlTexts.length);
			const errors: string[] = [];
			let completedTasks = 0;
			let nextTaskIndex = 0;

			const cleanup = () => {
				this.workers.forEach((worker) => {
					worker.onmessage = null;
					worker.onerror = null;
				});
			};

			const processNextTask = (workerIndex: number) => {
				if (nextTaskIndex >= xmlTexts.length || this.isTerminated) return;

				const taskId = nextTaskIndex++;
				this.workers[workerIndex].postMessage({
					id: taskId,
					xmlText: xmlTexts[taskId],
					seaAtZero
				});
			};

			this.workers.forEach((worker, workerIndex) => {
				worker.onmessage = (e) => {
					if (this.isTerminated) return;

					const result = e.data;
					if (result.error) {
						errors.push(`Task ${result.id}: ${result.error}`);
					} else {
						results[result.id] = result.content;
					}

					completedTasks++;
					processNextTask(workerIndex);

					if (completedTasks === xmlTexts.length) {
						cleanup();
						if (errors.length > 0) {
							reject(new Error(`XML parsing errors: ${errors.join(', ')}`));
						} else {
							resolve(results);
						}
					}
				};

				worker.onerror = (error) => {
					cleanup();
					reject(new Error(`Worker error: ${error.message}`));
				};
			});

			for (let i = 0; i < Math.min(this.maxWorkers, xmlTexts.length); i++) {
				processNextTask(i);
			}
		});
	}

	terminate() {
		if (this.isTerminated) return;
		this.isTerminated = true;
		this.workers.forEach((worker) => {
			worker.onmessage = null;
			worker.onerror = null;
			try {
				worker.terminate();
			} catch { /* ignore */ }
		});
		this.workers = [];
	}
}

// ============================
// DEM処理
// ============================

const getNpArray = (content: DemContent): NpArrayData => {
	const metaData = content.meta_data;
	const elevation = content.elevation.items;
	const xLength = metaData.grid_length.x;
	const yLength = metaData.grid_length.y;

	const array: number[][] = Array(yLength)
		.fill(null)
		.map(() => Array(xLength).fill(-9999));

	const startPointX = metaData.start_point.x;
	const startPointY = metaData.start_point.y;

	let index = 0;
	let currentStartPointX = startPointX;

	for (let y = startPointY; y < yLength; y++) {
		for (let x = currentStartPointX; x < xLength; x++) {
			try {
				const insertValue = parseFloat(elevation[index]);
				if (!isNaN(insertValue)) {
					array[y][x] = insertValue;
				}
			} catch {
				break;
			}
			index++;
		}
		currentStartPointX = 0;
	}

	return { mesh_code: content.mesh_code, array };
};

/**
 * 複数メッシュのDEMデータを1枚のFloat32Arrayに結合する
 */
const mergeDemArrays = (
	contentList: DemContent[],
	npArrayList: NpArrayData[]
): DemXmlResult => {
	const metaDataList = contentList.map((c) => c.meta_data);

	// 全体のbboxを計算
	const minLat = Math.min(...metaDataList.map((m) => m.lower_corner.lat));
	const minLon = Math.min(...metaDataList.map((m) => m.lower_corner.lon));
	const maxLat = Math.max(...metaDataList.map((m) => m.upper_corner.lat));
	const maxLon = Math.max(...metaDataList.map((m) => m.upper_corner.lon));

	// ピクセルサイズ（全メッシュ共通と仮定）
	const pixelSizeX = metaDataList[0].pixel_size.x;
	const pixelSizeY = Math.abs(metaDataList[0].pixel_size.y);

	// 全体のグリッドサイズ
	const totalWidth = Math.round((maxLon - minLon) / pixelSizeX);
	const totalHeight = Math.round((maxLat - minLat) / pixelSizeY);

	const result = new Float32Array(totalWidth * totalHeight).fill(-9999);

	// 各メッシュを全体配列に配置
	for (let i = 0; i < contentList.length; i++) {
		const meta = contentList[i].meta_data;
		const npArray = npArrayList[i].array;

		// このメッシュの左上ピクセルの全体配列内オフセット
		const offsetX = Math.round((meta.lower_corner.lon - minLon) / pixelSizeX);
		const offsetY = Math.round((maxLat - meta.upper_corner.lat) / pixelSizeY);

		const meshHeight = npArray.length;
		const meshWidth = npArray[0]?.length ?? 0;

		for (let y = 0; y < meshHeight; y++) {
			for (let x = 0; x < meshWidth; x++) {
				const globalX = offsetX + x;
				const globalY = offsetY + y;
				if (globalX >= 0 && globalX < totalWidth && globalY >= 0 && globalY < totalHeight) {
					const val = npArray[y][x];
					if (val !== -9999) {
						result[globalY * totalWidth + globalX] = val;
					}
				}
			}
		}
	}

	return {
		data: result,
		width: totalWidth,
		height: totalHeight,
		bbox: [minLon, minLat, maxLon, maxLat],
		nodata: -9999
	};
};

// ============================
// 公開API
// ============================

/**
 * 基盤地図情報DEM XMLファイルを解析してラスターデータを返す
 * XML単体、複数XML、ZIPに対応
 */
export const parseDemXml = async (
	input: File | File[],
	seaAtZero: boolean = false,
	onProgress?: (current: number, total: number, fileName: string) => void
): Promise<DemXmlResult> => {
	const xmlTexts: string[] = [];

	if (Array.isArray(input)) {
		// 複数ファイル
		const xmlFiles = input.filter((f) => f.name.toLowerCase().endsWith('.xml'));
		if (xmlFiles.length === 0) throw new Error('XMLファイルが見つかりません');

		for (let i = 0; i < xmlFiles.length; i++) {
			onProgress?.(i + 1, xmlFiles.length, xmlFiles[i].name);
			xmlTexts.push(await xmlFiles[i].text());
		}
	} else if (input.name.toLowerCase().endsWith('.xml')) {
		// 単一XML
		onProgress?.(1, 1, input.name);
		xmlTexts.push(await input.text());
	} else if (input.name.toLowerCase().endsWith('.zip')) {
		// ZIPファイル
		const zip = await JSZip.loadAsync(input);
		const xmlNames: string[] = [];
		zip.forEach((path, file) => {
			if (!file.dir && path.toLowerCase().endsWith('.xml')) {
				xmlNames.push(path);
			}
		});

		if (xmlNames.length === 0) throw new Error('ZIP内にXMLファイルが見つかりません');

		for (let i = 0; i < xmlNames.length; i++) {
			onProgress?.(i + 1, xmlNames.length, xmlNames[i]);
			const content = await zip.file(xmlNames[i])?.async('string');
			if (content) xmlTexts.push(content);
		}
	} else {
		throw new Error('対応していないファイル形式です（.xml または .zip）');
	}

	// 並列パース
	const parser = new ParallelXmlParser();
	try {
		const contentList = await parser.parseXmlFiles(xmlTexts, seaAtZero);
		contentList.sort((a, b) => a.mesh_code - b.mesh_code);

		const npArrayList = contentList.map((c) => getNpArray(c));
		return mergeDemArrays(contentList, npArrayList);
	} finally {
		parser.terminate();
	}
};
