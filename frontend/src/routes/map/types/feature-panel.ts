import type {
	ResultAddressData,
	ResultCoordinateData,
	ResultPoiData
} from '$routes/map/utils/data/search-result';
import type { FeatureProp } from '$routes/map/types/properties';

export type FeaturePanelData =
	| LayerFeaturePanelData
	| SearchAddressPanelData
	| SearchCoordinatePanelData
	| SearchPoiPanelData;

// サイドメニューの通常地物データ
export interface FeatureMenuData {
	point: [number, number];
	properties: FeatureProp | null;
	featureId: number;
	layerId: string;
}

export type LayerFeaturePanelData = FeatureMenuData & {
	kind: 'layer-feature';
};

export interface SearchAddressPanelData {
	kind: 'search-address';
	searchId: number | null;
	result: ResultAddressData;
}

export interface SearchCoordinatePanelData {
	kind: 'search-coordinate';
	searchId: number | null;
	result: ResultCoordinateData;
}

export interface SearchPoiPanelData {
	kind: 'search-poi';
	searchId: number | null;
	result: ResultPoiData;
}

export type FeaturePanelImageSource = 'static' | 'inaturalist' | 'wikipedia';

export type FeaturePanelMedia =
	| FeaturePanelImageMedia
	| FeaturePanelVideoMedia
	| FeaturePanelAudioMedia;

export interface FeaturePanelImageMedia {
	type: 'image';
	url: string;
	alt: string;
	source?: FeaturePanelImageSource;
	credit?: string;
	licenseName?: string;
	licenseUrl?: string;
	linkUrl?: string;
	fit?: 'cover' | 'contain';
}

export interface FeaturePanelVideoMedia {
	type: 'video' | 'youtube';
	url: string;
	title: string;
	thumbnailUrl?: string;
}

export interface FeaturePanelAudioMedia {
	type: 'audio';
	url: string;
	title: string;
	source?: 'static' | 'external';
	credit?: string;
	licenseName?: string;
	licenseUrl?: string;
}

export interface TimberSpecies {
	url: string;
	distribution?: string;
}

export interface FeaturePanelSummary {
	title: string;
	subtitle?: string;
	point?: [number, number];
	media?: FeaturePanelMedia[];
	protectionForestName?: string;
	protectionForestDescription?: string;
	taxonomy?: Array<{
		label: string;
		value: string;
	}>;
	timberSpecies?: TimberSpecies;
	description?: string;
	sourceUrl?: string;
	sourceLabel?: string;
}

export const createLayerFeaturePanelData = (data: FeatureMenuData): LayerFeaturePanelData => ({
	kind: 'layer-feature',
	...data
});

export const createSearchFeaturePanelData = (
	result: ResultPoiData | ResultAddressData | ResultCoordinateData,
	searchId: number | null
): SearchPoiPanelData | SearchAddressPanelData | SearchCoordinatePanelData => {
	if (result.type === 'poi') {
		return {
			kind: 'search-poi',
			searchId,
			result
		};
	}

	if (result.type === 'address') {
		return {
			kind: 'search-address',
			searchId,
			result
		};
	}

	return {
		kind: 'search-coordinate',
		searchId,
		result
	};
};
