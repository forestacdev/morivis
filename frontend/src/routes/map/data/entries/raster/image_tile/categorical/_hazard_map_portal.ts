import { IMAGE_TILE_XYZ_SETS } from '$routes/constants';
import { WEB_MERCATOR_JAPAN_BOUNDS } from '$routes/map/data/entries/_meta_data/_bounds';
import { DEFAULT_RASTER_CATEGORICAL_STYLE } from '$routes/map/data/entries/raster/_style';
import type { RasterCategoricalStyle, RasterImageEntry } from '$routes/map/data/types/raster';
import type { TileXYZ } from '$routes/map/data/types/raster';
import type { Tag } from '$routes/map/data/types/tags';

type HazardLegendItem = {
	color: string;
	label: string;
};

type HazardEntryConfig = {
	id: string;
	name: string;
	description: string;
	url: string;
	tags: Tag[];
	guideColor: HazardLegendItem[];
	xyzImageTile?: TileXYZ;
};

export const createHazardMapPortalEntry = ({
	id,
	name,
	description,
	url,
	tags,
	guideColor,
	xyzImageTile = IMAGE_TILE_XYZ_SETS.zoom_9
}: HazardEntryConfig): RasterImageEntry<RasterCategoricalStyle> => {
	return {
		id,
		type: 'raster',
		format: {
			type: 'image',
			url
		},
		metaData: {
			name,
			sourceDataName: name,
			description,
			attribution: 'ハザードマップポータルサイト',
			downloadUrl:
				'https://disaportal.gsi.go.jp/hazardmapportal/hazardmap/copyright/opendata.html',
			location: '全国',
			tags,
			minZoom: 2,
			maxZoom: 17,
			tileSize: 256,
			xyzImageTile,
			bounds: WEB_MERCATOR_JAPAN_BOUNDS
		},
		interaction: {
			clickable: false
		},
		style: {
			...DEFAULT_RASTER_CATEGORICAL_STYLE,
			legend: {
				type: 'category',
				name,
				colors: guideColor.map((item) => item.color),
				labels: guideColor.map((item) => item.label)
			}
		}
	};
};
