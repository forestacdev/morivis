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
