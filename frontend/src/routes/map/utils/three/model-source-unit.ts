import type { ModelSourceUnit } from '$routes/map/data/types/model';

export type UploadedModelFile = File & {
	morivisModelSourceUnit?: ModelSourceUnit;
	morivisMinecraftRegion?: { x: number; z: number; };
	morivisMinecraftRegions?: { x: number; z: number; }[];
};

export const getUploadedMinecraftRegion = (file: File) =>
	(file as UploadedModelFile).morivisMinecraftRegion;

export const getUploadedMinecraftRegions = (file: File) =>
	(file as UploadedModelFile).morivisMinecraftRegions;

/** 変換済みのローカルファイルから、元データの座標単位をentryへ引き継ぐ。 */
export const getUploadedModelSourceUnit = (file: File): ModelSourceUnit | undefined =>
	(file as UploadedModelFile).morivisModelSourceUnit === 'minecraft-block'
		? 'minecraft-block'
		: undefined;
