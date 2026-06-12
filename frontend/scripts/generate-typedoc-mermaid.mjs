import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const cwd = process.cwd();
const typedocJsonPath = path.resolve(cwd, 'docs/typedoc.json');
const diagramBasePath = path.resolve(cwd, 'docs/diagrams/morivis-layer-entry-hierarchy');
const markdownOutputPath = `${diagramBasePath}.md`;
const mermaidOutputPath = `${diagramBasePath}.mmd`;

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

const renderMermaid = (edges) => {
	const lines = ['```mermaid', 'flowchart TD'];

	edges.forEach(([from, to]) => {
		lines.push(`    ${toNodeId(from)}["${from}"] --> ${toNodeId(to)}["${to}"]`);
	});

	lines.push('```');
	return lines.join('\n');
};

const renderMarkdown = (edges) => {
	const mermaid = renderMermaid(edges);

	return `# Morivis Layer Entry Hierarchy

TypeDoc JSON から抽出した morivis のレイヤー型関係図です。

${mermaid}
`;
};

const main = async () => {
	const typedocJson = JSON.parse(await readFile(typedocJsonPath, 'utf8'));
	const indexes = buildReflectionIndexes(typedocJson);
	const edges = buildLayerEntryEdges(indexes);
	const mermaid = renderMermaid(edges);

	await mkdir(path.dirname(markdownOutputPath), { recursive: true });
	await writeFile(markdownOutputPath, renderMarkdown(edges), 'utf8');
	await writeFile(mermaidOutputPath, mermaid.replace(/^```mermaid\n|\n```$/g, ''), 'utf8');

	console.log(`Generated ${path.relative(cwd, markdownOutputPath)}`);
	console.log(`Generated ${path.relative(cwd, mermaidOutputPath)}`);
};

void main();
