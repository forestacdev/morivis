export interface ImageMediaData {
	type: 'image';
	url: string;
}

export interface VideoMediaData {
	type: 'video';
	url: string;
}

export interface AudioMediaData {
	type: 'audio';
	url: string;
}

export interface YoutubeMediaData {
	type: 'youtube';
	id: string;
}

export type MediaData = ImageMediaData | VideoMediaData | AudioMediaData | YoutubeMediaData;

export interface DetailData {
	description: string | null;
	url: string | null;
	medias?: MediaData[];
}

export type DetailsById = Record<string, DetailData>;
