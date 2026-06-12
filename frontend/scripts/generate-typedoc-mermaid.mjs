import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const cwd = process.cwd();
const typedocJsonPath = path.resolve(cwd, 'docs/typedoc.json');
const diagramsDirPath = path.resolve(cwd, '../docs/architecture/diagrams');

const ALIAS_COLLAPSE_PREFIX = 'Any';

const toNodeId = (name) => name.replace(/[^A-Za-z0-9_]/g, '_');

const walkReflections = (reflection, callback) => {
	callback(reflection);

	if (Array.isArray(reflection.children)) {
		reflection.children.forEach((child) => walkReflections(child, callback));
	}

	if (Array.isArray(reflection.documents)) {
		reflection.documents.forEach((child) => walkReflections(child, callback));
	}
};

const buildReflectionIndexes = (project) => {
	const byId = new Map();
	const byName = new Map();

	walkReflections(project, (reflection) => {
		if (typeof reflection.id === 'number') {
			byId.set(reflection.id, reflection);
		}

		if (typeof reflection.name === 'string') {
			byName.set(reflection.name, reflection);
		}
	});

	return { byId, byName };
};

const getReferenceTargetName = (typeNode, byId) => {
	if (!typeNode || typeNode.type !== 'reference') return null;

	if (typeof typeNode.target === 'number') {
		return byId.get(typeNode.target)?.name ?? typeNode.name ?? null;
	}

	return typeNode.name ?? null;
};

const resolveCollapsedReferenceNames = (typeNode, indexes, visited = new Set()) => {
	if (!typeNode) return [];

	if (typeNode.type === 'union') {
		return typeNode.types.flatMap((child) =>
			resolveCollapsedReferenceNames(child, indexes, visited)
		);
	}

	if (typeNode.type !== 'reference') return [];

	const referenceName = getReferenceTargetName(typeNode, indexes.byId);
	if (!referenceName) return [];

	if (visited.has(referenceName)) return [referenceName];

	const reflection = indexes.byName.get(referenceName);
	if (!reflection?.type) return [referenceName];

	if (!referenceName.startsWith(ALIAS_COLLAPSE_PREFIX)) {
		return [referenceName];
	}

	visited.add(referenceName);
	const collapsed = resolveCollapsedReferenceNames(reflection.type, indexes, visited);
	visited.delete(referenceName);

	return collapsed.length > 0 ? collapsed : [referenceName];
};

const getUnionChildren = (name, indexes) => {
	const reflection = indexes.byName.get(name);
	if (!reflection?.type) return [];

	return [...new Set(resolveCollapsedReferenceNames(reflection.type, indexes))].filter(
		(childName) => childName !== name
	);
};

const getUnionLiteralValues = (name, indexes) => {
	const reflection = indexes.byName.get(name);
	if (!reflection?.type || reflection.type.type !== 'union') return [];

	return reflection.type.types
		.filter((child) => child.type === 'literal' && typeof child.value === 'string')
		.map((child) => child.value);
};

const getReverseAliasChildren = (parentName, indexes, matcher = () => true) => {
	const children = [];

	indexes.byName.forEach((reflection, name) => {
		if (name === parentName || !reflection?.type || !matcher(name)) return;
		if (reflection.type.type !== 'reference') return;

		const referenceName = getReferenceTargetName(reflection.type, indexes.byId);
		if (referenceName === parentName) {
			children.push(name);
		}
	});

	return children.sort((a, b) => a.localeCompare(b, 'en'));
};

const pushEdges = (edges, parentName, childNames) => {
	childNames.forEach((childName) => {
		edges.push([parentName, childName]);
	});
};

const buildLayerEntryEdges = (indexes) => {
	const edges = [];

	pushEdges(edges, 'MorivisLayerEntry', getUnionChildren('MorivisLayerEntry', indexes));
	pushEdges(edges, 'MorivisVectorEntry', getUnionChildren('MorivisVectorEntry', indexes));
	pushEdges(
		edges,
		'MorivisRasterEntry',
		getReverseAliasChildren(
			'MorivisRasterEntry',
			indexes,
			(name) =>
				name.endsWith('RasterEntry')
				&& name !== 'MorivisRasterEntry'
				&& !name.startsWith(ALIAS_COLLAPSE_PREFIX)
		)
	);
	pushEdges(edges, 'MorivisModelEntry', getUnionChildren('MorivisModelEntry', indexes));
	pushEdges(edges, 'DeckVectorEntry', getUnionChildren('DeckVectorEntry', indexes));

	return edges;
};

const buildVectorDetailEdges = (indexes) => {
	const edges = [];
	const vectorChildren = getUnionChildren('MorivisVectorEntry', indexes);
	const vectorFormatLabels = {
		geojson: 'GeoJSON',
		fgb: 'FlatGeobuf',
		mvt: 'MVT',
		pmtiles: 'PMTiles',
		mbtiles: 'MBTiles',
		geojsontile: 'GeoJSON Tile',
		'esri-feature': 'ArcGIS FeatureServer',
		'ogc-feature': 'OGC API Features',
		'wfs-feature': 'WFS'
	};
	const vectorFormats = getUnionLiteralValues('VectorFormatType', indexes).map(
		(format) => vectorFormatLabels[format] ?? format
	);

	pushEdges(edges, 'MorivisVectorEntry', vectorChildren);

	vectorChildren.forEach((childName) => {
		pushEdges(edges, childName, vectorFormats);
	});

	return edges;
};

const buildRasterDetailEdges = (indexes) => {
	const edges = [];
	const rasterChildren = getReverseAliasChildren(
		'MorivisRasterEntry',
		indexes,
		(name) =>
			name.endsWith('RasterEntry')
			&& name !== 'MorivisRasterEntry'
			&& !name.startsWith(ALIAS_COLLAPSE_PREFIX)
	);
	const demModeLabels = {
		default: 'Default',
		relief: 'Relief',
		slope: 'Slope',
		aspect: 'Aspect',
		curvature: 'Curvature',
		shadow: 'Shadow'
	};
	const bandModeLabels = {
		single: 'Single Band',
		multi: 'Multi Band',
		twi: 'TWI',
		slope: 'Slope',
		aspect: 'Aspect',
		tpi: 'TPI',
		topex: 'TOPEX'
	};
	const demModes = ['default', 'relief', 'slope', 'aspect', 'curvature', 'shadow'].map(
		(mode) => demModeLabels[mode] ?? mode
	);
	const bandModes = getUnionLiteralValues('BandTypeKey', indexes).map(
		(mode) => bandModeLabels[mode] ?? mode
	);

	pushEdges(edges, 'MorivisRasterEntry', rasterChildren);
	pushEdges(edges, 'DemRasterEntry', demModes);
	pushEdges(edges, 'TiffRasterEntry', bandModes);

	return edges;
};

const buildModelDetailEdges = (indexes) => {
	const edges = [];
	const modelChildren = getUnionChildren('MorivisModelEntry', indexes);
	const deckVectorChildren = getUnionChildren('DeckVectorEntry', indexes);
	const meshFormatLabels = {
		gltf: 'glTF',
		obj: 'OBJ',
		'3ds': '3DS',
		dae: 'DAE',
		'3dm': '3DM',
		fbx: 'FBX',
		drc: 'DRC',
		'3mf': '3MF',
		amf: 'AMF',
		ifc: 'IFC'
	};
	const meshFormats = getUnionLiteralValues('MeshFormatType', indexes).map(
		(format) => meshFormatLabels[format] ?? format
	);

	pushEdges(edges, 'MorivisModelEntry', modelChildren);
	pushEdges(edges, 'DeckVectorEntry', deckVectorChildren);
	pushEdges(edges, 'MeshEntry', meshFormats);
	pushEdges(edges, 'Tiles3DEntry', ['3D Tiles']);
	pushEdges(edges, 'PointCloudEntry', ['Point Cloud']);
	pushEdges(edges, 'GeoArrowEntry', ['GeoArrow']);
	pushEdges(edges, 'GeoJson3DEntry', ['GeoJSON 3D']);
	pushEdges(edges, 'MeshEntry', ['three.js']);
	pushEdges(edges, 'Tiles3DEntry', ['deck.gl']);
	pushEdges(edges, 'PointCloudEntry', ['deck.gl']);
	pushEdges(edges, 'DeckVectorEntry', ['deck.gl']);

	return edges;
};

const renderMermaid = (edges) => {
	const lines = ['```mermaid', 'flowchart TD'];

	edges.forEach(([from, to]) => {
		lines.push(`    ${toNodeId(from)}["${from}"] --> ${toNodeId(to)}["${to}"]`);
	});

	lines.push('```');
	return lines.join('\n');
};

const writeDiagram = async ({ fileBaseName, title, description, edges }) => {
	const diagramBasePath = path.resolve(diagramsDirPath, fileBaseName);
	const markdownOutputPath = `${diagramBasePath}.md`;
	const mermaidOutputPath = `${diagramBasePath}.mmd`;
	const mermaid = renderMermaid(edges);

	await writeFile(
		markdownOutputPath,
		`# ${title}

${description}

${mermaid}
`,
		'utf8'
	);
	await writeFile(mermaidOutputPath, mermaid.replace(/^```mermaid\n|\n```$/g, ''), 'utf8');

	console.log(`Generated ${path.relative(cwd, markdownOutputPath)}`);
	console.log(`Generated ${path.relative(cwd, mermaidOutputPath)}`);
};

const main = async () => {
	const typedocJson = JSON.parse(await readFile(typedocJsonPath, 'utf8'));
	const indexes = buildReflectionIndexes(typedocJson);

	await mkdir(diagramsDirPath, { recursive: true });
	await writeDiagram({
		fileBaseName: 'morivis-layer-entry-hierarchy',
		title: 'Morivis Layer Entry Hierarchy',
		description: 'TypeDoc JSON から抽出した morivis のレイヤー型関係図です。',
		edges: buildLayerEntryEdges(indexes)
	});
	await writeDiagram({
		fileBaseName: 'morivis-vector-entry-detail',
		title: 'Morivis Vector Entry Detail',
		description:
			'TypeDoc JSON の型階層に、geometry ごとで共通に扱う format 群を補って整理した vector 詳細図です。',
		edges: buildVectorDetailEdges(indexes)
	});
	await writeDiagram({
		fileBaseName: 'morivis-raster-entry-detail',
		title: 'Morivis Raster Entry Detail',
		description:
			'TypeDoc JSON の型階層に、raster の主要分類と DEM / TIFF の可視化モードを補って整理した詳細図です。',
		edges: buildRasterDetailEdges(indexes)
	});
	await writeDiagram({
		fileBaseName: 'morivis-model-entry-detail',
		title: 'Morivis Model Entry Detail',
		description:
			'TypeDoc JSON の型階層に、model の主要分類と mesh format / deck vector 分岐、および three.js / deck.gl への描画先を補って整理した詳細図です。',
		edges: buildModelDetailEdges(indexes)
	});
};

void main();
