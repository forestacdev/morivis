import { XMLParser } from 'fast-xml-parser';
import JSZip from 'jszip';

export interface BcfComment {
	guid?: string;
	author?: string;
	date?: string;
	text: string;
}

export interface BcfTopic {
	guid: string;
	title: string;
	description?: string;
	status?: string;
	type?: string;
	priority?: string;
	comments: BcfComment[];
	selectionIfcGuids: string[];
	visibilityExceptionIfcGuids: string[];
	viewpoints: BcfViewpoint[];
}

export interface BcfViewpoint {
	guid?: string;
	camera?: BcfCamera;
	snapshot?: Blob;
	selectionIfcGuids: string[];
	visibilityExceptionIfcGuids: string[];
}

export interface BcfCamera {
	type: 'orthographic' | 'perspective';
	position: [number, number, number];
	direction: [number, number, number];
	up: [number, number, number];
	viewToWorldScale?: number;
	fieldOfView?: number;
}

export interface BcfDocument {
	version?: string;
	topics: BcfTopic[];
}

export class BcfParseError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'BcfParseError';
	}
}

type XmlRecord = Record<string, unknown>;

const xmlParser = new XMLParser({
	ignoreAttributes: false,
	attributeNamePrefix: '',
	trimValues: true
});

const toArray = <T>(value: T | T[] | undefined): T[] => {
	if (value === undefined) return [];
	return Array.isArray(value) ? value : [value];
};

const asRecord = (value: unknown): XmlRecord | null => {
	return value && typeof value === 'object' && !Array.isArray(value)
		? (value as XmlRecord)
		: null;
};

const getText = (value: unknown): string | undefined => {
	if (typeof value === 'string' || typeof value === 'number') return String(value);
	const record = asRecord(value);
	if (!record) return undefined;
	return getText(record['#text']) ?? getText(record.__text);
};

const getRoot = (parsed: XmlRecord): XmlRecord => {
	const root = Object.entries(parsed).find(
		([key, value]) => key !== '?xml' && asRecord(value)
	)?.[1];
	return asRecord(root) ?? parsed;
};

const getString = (record: XmlRecord, ...keys: string[]): string | undefined => {
	for (const key of keys) {
		const value = getText(record[key]);
		if (value) return value;
	}
	return undefined;
};

const getComponentIfcGuids = (value: unknown): string[] => {
	const components = asRecord(value);
	return toArray(components?.Component)
		.map((component) => getString(asRecord(component) ?? {}, 'IfcGuid'))
		.filter((guid): guid is string => Boolean(guid));
};

const getVector = (value: unknown): [number, number, number] | undefined => {
	const record = asRecord(value);
	if (!record) return undefined;
	const coordinates = ['X', 'Y', 'Z'].map((key) => Number(getText(record[key])));
	return coordinates.every(Number.isFinite)
		? (coordinates as [number, number, number])
		: undefined;
};

const parseCamera = (root: XmlRecord): BcfCamera | undefined => {
	const orthographic = asRecord(root.OrthogonalCamera);
	const perspective = asRecord(root.PerspectiveCamera);
	const camera = orthographic ?? perspective;
	if (!camera) return undefined;

	const position = getVector(camera.CameraViewPoint);
	const direction = getVector(camera.CameraDirection);
	const up = getVector(camera.CameraUpVector);
	if (!position || !direction || !up) return undefined;

	const type = orthographic ? 'orthographic' : 'perspective';
	const scale = Number(getText(camera.ViewToWorldScale));
	const fieldOfView = Number(getText(camera.FieldOfView));
	return {
		type,
		position,
		direction,
		up,
		...(Number.isFinite(scale) ? { viewToWorldScale: scale } : {}),
		...(Number.isFinite(fieldOfView) ? { fieldOfView } : {})
	};
};

const parseViewpoint = (xml: string, snapshot?: Blob): BcfViewpoint => {
	const root = getRoot(xmlParser.parse(xml) as XmlRecord);
	const components = asRecord(root.Components);
	const visibility = asRecord(components?.Visibility);
	return {
		guid: getString(root, 'Guid'),
		camera: parseCamera(root),
		snapshot,
		selectionIfcGuids: getComponentIfcGuids(asRecord(components?.Selection)),
		visibilityExceptionIfcGuids: getComponentIfcGuids(
			asRecord(visibility?.Exceptions)
		)
	};
};

const parseTopic = (markupXml: string, viewpoints: BcfViewpoint[]): BcfTopic => {
	const markupRoot = getRoot(xmlParser.parse(markupXml) as XmlRecord);
	const topic = asRecord(toArray(markupRoot.Topic)[0]);
	if (!topic) throw new BcfParseError('BCFのTopic情報が見つかりません');

	const guid = getString(topic, 'Guid');
	if (!guid) throw new BcfParseError('BCFのTopic GUIDが見つかりません');

	const topicComments = asRecord(topic.Comments);
	const comments = toArray(topicComments?.Comment ?? markupRoot.Comment).flatMap((value) => {
		const comment = asRecord(value);
		if (!comment) return [];
		return [
			{
				guid: getString(comment, 'Guid'),
				author: getString(comment, 'Author'),
				date: getString(comment, 'Date'),
				text: getText(comment.Comment) ?? ''
			}
		];
	});
	const selectionIfcGuids = Array.from(
		new Set(viewpoints.flatMap((viewpoint) => viewpoint.selectionIfcGuids))
	);
	const visibilityExceptionIfcGuids = Array.from(
		new Set(viewpoints.flatMap((viewpoint) => viewpoint.visibilityExceptionIfcGuids))
	);

	return {
		guid,
		title: getString(topic, 'Title') ?? '無題の課題',
		description: getText(topic.Description),
		status: getString(topic, 'TopicStatus', 'Status'),
		type: getString(topic, 'TopicType', 'Type'),
		priority: getString(topic, 'Priority'),
		comments,
		selectionIfcGuids,
		visibilityExceptionIfcGuids,
		viewpoints
	};
};

export const parseBcfArchive = async (archive: ArrayBuffer): Promise<BcfDocument> => {
	let zip: JSZip;
	try {
		zip = await JSZip.loadAsync(archive);
	} catch {
		throw new BcfParseError('BCFファイルをZIPとして開けませんでした');
	}

	const versionFile = zip.file('bcf.version');
	const versionXml = versionFile ? await versionFile.async('text') : undefined;
	const versionRoot = versionXml ? getRoot(xmlParser.parse(versionXml) as XmlRecord) : null;
	const version = versionRoot ? getString(versionRoot, 'VersionId') : undefined;
	const markupPaths = Object.keys(zip.files).filter((path) => {
		const normalizedPath = path.toLowerCase();
		return normalizedPath === 'markup.bcf' || normalizedPath.endsWith('/markup.bcf');
	});
	if (markupPaths.length === 0) throw new BcfParseError('BCF内にmarkup.bcfが見つかりません');

	const topics = await Promise.all(
		markupPaths.map(async (markupPath) => {
			const markupFile = zip.file(markupPath);
			if (!markupFile) throw new BcfParseError('BCFのTopicを読み込めません');
			const directory = markupPath.slice(0, markupPath.lastIndexOf('/') + 1);
			const viewpointFiles = Object.entries(zip.files)
				.filter(
					([path, entry]) =>
						path.startsWith(directory) && path.toLowerCase().endsWith('.bcfv')
						&& !entry.dir
				)
				.map(([, entry]) => entry);
			const markupXml = await markupFile.async('text');
			const markupRoot = getRoot(xmlParser.parse(markupXml) as XmlRecord);
			const markupTopic = asRecord(toArray(markupRoot.Topic)[0]);
			const markupViewpoints = toArray(asRecord(markupTopic?.Viewpoints)?.ViewPoint);
			const snapshotsByViewpoint = new Map(
				markupViewpoints.flatMap((viewpoint) => {
					const record = asRecord(viewpoint);
					const viewpointName = getText(record?.Viewpoint);
					const snapshotName = getText(record?.Snapshot);
					return viewpointName && snapshotName
						? [[viewpointName, snapshotName] as const]
						: [];
				})
			);
			const viewpoints = await Promise.all(
				viewpointFiles.map(async (entry) => {
					const fileName = entry.name.slice(directory.length);
					const snapshotName = snapshotsByViewpoint.get(fileName);
					const snapshotFile = snapshotName
						? zip.file(`${directory}${snapshotName}`)
						: null;
					return parseViewpoint(
						await entry.async('text'),
						snapshotFile ? await snapshotFile.async('blob') : undefined
					);
				})
			);
			return parseTopic(markupXml, viewpoints);
		})
	);

	return { version, topics };
};

export const parseBcfFile = async (file: File): Promise<BcfDocument> => {
	return parseBcfArchive(await file.arrayBuffer());
};
