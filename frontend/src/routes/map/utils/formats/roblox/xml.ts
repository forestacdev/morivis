import { DOMParser } from '@xmldom/xmldom';
import {
	instancesToWorld,
	type RobloxInstance,
	type RobloxVector,
	type RobloxWorld,
	supportedClasses,
	textureClasses
} from './world';

const children = (node: Element, tag?: string): Element[] => {
	const result: Element[] = [];
	for (let child = node.firstChild; child; child = child.nextSibling) {
		if (child.nodeType === 1 && (!tag || (child as Element).tagName === tag)) {
			result.push(child as Element);
		}
	}
	return result;
};
const numeric = (node: Element | undefined, fallback: number): number => {
	if (!node) return fallback;
	const text = node.textContent?.trim();
	const value = text ? Number(text) : NaN;
	if (!Number.isFinite(value)) throw new Error('パーツに不正な数値があります。');
	return value;
};
const components = (node: Element | undefined, names: string[], defaults: number[]) => {
	const fields = new Map(node ? children(node).map(child => [child.tagName, child]) : []);
	return names.map((name, i) => numeric(fields.get(name), defaults[i]));
};
export const parseRbxlx = (text: string): RobloxWorld => {
	if (/<!DOCTYPE|<!ENTITY/i.test(text)) throw new Error('DOCTYPEを含むXMLは読み込めません。');
	let invalidXml = false;
	const doc = new DOMParser({
		errorHandler: {
			warning: () => {
				invalidXml = true;
			},
			error: () => {
				invalidXml = true;
			},
			fatalError: () => {
				invalidXml = true;
			}
		}
	}).parseFromString(text, 'text/xml') as unknown as Document;
	const root = doc.documentElement;
	if (invalidXml || !root || root.tagName !== 'roblox' || root.getAttribute('version') !== '4') {
		throw new Error('Roblox XML形式（.rbxlx / version 4）のファイルではありません。');
	}
	const workspaces = children(root, 'Item').filter(item =>
		['Workspace', 'MaterialService'].includes(item.getAttribute('class') ?? '')
	);
	if (!workspaces.length) throw new Error('ワールドにWorkspaceがありません。');
	const roots: RobloxInstance[] = [];
	const stack = workspaces.map(element => ({ element, target: roots }));
	while (stack.length) {
		const { element, target } = stack.pop()!;
		const node: RobloxInstance = {
			className: element.getAttribute('class') ?? '',
			children: []
		};
		target.push(node);
		for (const child of children(element, 'Item')) {
			stack.push({ element: child, target: node.children });
		}
		if (
			!supportedClasses.has(node.className) && !textureClasses.has(node.className)
			&& node.className !== 'Terrain' && node.className !== 'MaterialService'
		) continue;
		const properties = new Map(
			children(children(element, 'Properties')[0] ?? element).map(
				property => [property.getAttribute('name'), property]
			)
		);
		if (node.className === 'Terrain') {
			node.terrainData = ['SmoothGrid', 'ClusterGrid', 'PhysicsGrid'].some(key =>
				!!properties.get(key)?.textContent?.trim()
			);
			continue;
		}
		const content = (...keys: string[]) => {
			for (const key of keys) {
				const element = properties.get(key);
				const value = element?.textContent?.trim();
				if (value) return value;
			}
			return undefined;
		};
		if (node.className === 'MaterialService') {
			node.use2022Materials = properties.has('Use2022Materials')
				? content('Use2022Materials') === 'true'
				: undefined;
			node.materialOverrides = Object.fromEntries(
				[...properties].filter(([key]) => key?.endsWith('Name')).map((
					[key, value]
				) => [key!, value.textContent?.trim() ?? ''])
			);
			continue;
		}
		node.name = content('Name');
		node.materialVariant = content('MaterialVariantSerialized', 'MaterialVariant');
		if (properties.has('Material') || properties.has('BaseMaterial')) {
			node.material = numeric(
				properties.get('Material') ?? properties.get('BaseMaterial'),
				256
			);
		}
		if (properties.has('StudsPerTile')) {
			node.studsPerTile = numeric(properties.get('StudsPerTile'), 4);
		}
		node.materialPattern = numeric(properties.get('MaterialPattern'), 0);
		node.alphaMode = numeric(properties.get('AlphaMode'), 0);
		node.normalMap = content('NormalMapContent', 'NormalMap');
		node.roughnessMap = content('RoughnessMapContent', 'RoughnessMap');
		node.metalnessMap = content('MetalnessMapContent', 'MetalnessMap');
		node.texture = content('TextureContent', 'Texture');
		node.meshId = content('MeshId');
		node.textureId = content('TextureContent', 'TextureID');
		node.colorMap = content('ColorMapContent', 'ColorMap');
		if (textureClasses.has(node.className)) {
			node.face = numeric(properties.get('Face'), 5);
			node.tileU = numeric(properties.get('StudsPerTileU'), 2);
			node.tileV = numeric(properties.get('StudsPerTileV'), 2);
			node.offsetU = numeric(properties.get('OffsetStudsU'), 0);
			node.offsetV = numeric(properties.get('OffsetStudsV'), 0);
			node.zIndex = numeric(properties.get('ZIndex'), 1);
			const tint = properties.get('Color3') ?? properties.get('Color');
			node.color = components(tint, ['R', 'G', 'B'], [1, 1, 1]) as RobloxVector;
			node.transparency = numeric(properties.get('Transparency'), 0);
			continue;
		}
		node.transparency = numeric(properties.get('Transparency'), 0);
		node.shape = numeric(properties.get('shape') ?? properties.get('Shape'), 1);
		node.size = components(properties.get('size') ?? properties.get('Size'), ['X', 'Y', 'Z'], [
			4,
			1.2,
			2
		]) as RobloxVector;
		const frame = properties.get('CFrame');
		node.position = components(frame, ['X', 'Y', 'Z'], [0, 0, 0]) as RobloxVector;
		node.rotation = components(frame, [
			'R00',
			'R01',
			'R02',
			'R10',
			'R11',
			'R12',
			'R20',
			'R21',
			'R22'
		], [1, 0, 0, 0, 1, 0, 0, 0, 1]);
		if (properties.has('Color3uint8')) {
			const packed = numeric(properties.get('Color3uint8'), 0);
			node.color = [
				(packed >>> 16 & 255) / 255,
				(packed >>> 8 & 255) / 255,
				(packed & 255) / 255
			];
		} else if (properties.has('Color')) {
			node.color = components(properties.get('Color'), ['R', 'G', 'B'], [
				0,
				0,
				0
			]) as RobloxVector;
		}
		node.legacyColor = properties.has('BrickColor');
	}
	return instancesToWorld(roots);
};
