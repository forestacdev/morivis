import type { ResourceMaterial } from './resources/types';

export const isWaterBlock = (name: string) =>
	name === 'minecraft:water' || name === 'minecraft:bubble_column';

export const waterMaterial: ResourceMaterial = {
	key: 'minecraft:water',
	alphaMode: 'BLEND',
	opacity: 0.55
};
