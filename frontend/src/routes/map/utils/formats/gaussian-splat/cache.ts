import type { GaussianSplatData } from './index';

const dataByEntryId = new Map<string, GaussianSplatData>();

export const setGaussianSplatData = (entryId: string, data: GaussianSplatData) => {
	dataByEntryId.set(entryId, data);
};

export const takeGaussianSplatData = (entryId: string) => {
	const data = dataByEntryId.get(entryId);
	dataByEntryId.delete(entryId);
	return data;
};

export const removeGaussianSplatData = (entryId: string) => {
	dataByEntryId.delete(entryId);
};
