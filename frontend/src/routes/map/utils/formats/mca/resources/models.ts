import {
	type BlockDefinition,
	type BlockModel,
	type Condition,
	type ModelVariant,
	resourceId
} from './types';

const propertyMatches = (actual: string | undefined, expected: string) => {
	const negate = expected.startsWith('!');
	const values = (negate ? expected.slice(1) : expected).split('|');
	return negate ? !values.includes(actual ?? '') : values.includes(actual ?? '');
};
export const matchesCondition = (
	when: Condition,
	state: Record<string, string>,
	depth = 0
): boolean => {
	if (depth > 32) throw new Error('ブロック条件の入れ子が深すぎます');
	return Object.entries(when).every(([key, value]) => {
		if (key === 'OR' || key === 'AND') {
			if (!Array.isArray(value)) throw new Error('ブロック条件が不正です');
			const check = (child: Condition) => matchesCondition(child, state, depth + 1);
			return key === 'OR' ? value.some(check) : value.every(check);
		}
		if (typeof value !== 'string') throw new Error('ブロック条件が不正です');
		return propertyMatches(state[key], value);
	});
};
export const selectVariants = (
	definition: BlockDefinition,
	state: Record<string, string>
): ModelVariant[][] => {
	if (definition.multipart) {
		return definition.multipart.filter((part) =>
			!part.when || matchesCondition(part.when, state)
		)
			.map((part) => Array.isArray(part.apply) ? part.apply : [part.apply]);
	}
	for (const [key, value] of Object.entries(definition.variants ?? {})) {
		const matches = !key || key.split(',').every((condition) => {
			const [property, expected] = condition.split('=');
			return expected !== undefined && propertyMatches(state[property], expected);
		});
		if (matches) return [Array.isArray(value) ? value : [value]];
	}
	return [];
};

/** 位置から安定した重み付きvariantを選ぶ（ゲームと同一の乱数列ではない）。 */
export const chooseVariant = <T extends { weight?: number; }>(
	variants: T[],
	x: number,
	y: number,
	z: number,
	salt = 0
): T => {
	const total = variants.reduce((sum, variant) => sum + (variant.weight ?? 1), 0);
	let hash = Math.imul(x, 73428767) ^ Math.imul(y, 912931) ^ Math.imul(z, 438289) ^ salt;
	hash = Math.imul(hash ^ (hash >>> 16), 0x45d9f3b);
	let choice = ((hash ^ (hash >>> 16)) >>> 0) % total;
	for (const variant of variants) {
		choice -= variant.weight ?? 1;
		if (choice < 0) return variant;
	}
	return variants[0];
};

export const resolveTexture = (model: BlockModel, reference: string) => {
	const visited = new Set<string>();
	let forceTranslucent = false;
	if (Object.hasOwn(model.textures ?? {}, reference)) reference = `#${reference}`;
	while (reference.startsWith('#')) {
		if (visited.has(reference)) throw new Error('テクスチャ参照が循環しています');
		visited.add(reference);
		const key = reference.slice(1);
		const next = Object.hasOwn(model.textures ?? {}, key) ? model.textures?.[key] : undefined;
		if (!next) throw new Error(`テクスチャ参照がありません: ${reference}`);
		if (typeof next === 'string') reference = next;
		else {
			if (typeof next.sprite !== 'string') throw new Error('テクスチャ指定が不正です');
			forceTranslucent ||= next.force_translucent === true;
			reference = next.sprite;
		}
	}
	return { texture: resourceId(reference), forceTranslucent };
};
