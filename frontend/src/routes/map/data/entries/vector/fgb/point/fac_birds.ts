import { COVER_IMAGE_BASE_PATH, ENTRY_FGB_PATH, MAP_IMAGE_BASE_PATH } from '$routes/constants';
import { DEFAULT_POINT_LABEL_STYLE } from '$routes/map/data/entries/vector/_style';
import type { GeoJsonMetaData, PointEntry } from '$routes/map/data/types/vector';

const entry: PointEntry<GeoJsonMetaData> = {
	id: 'fac_birds',
	type: 'vector',
	format: {
		type: 'fgb',
		geometryType: 'Point',
		url: `${ENTRY_FGB_PATH}/fac_birds.fgb`
	},
	metaData: {
		name: 'アカデミー 鳥類調査',
		description: '授業で観測した鳥類のデータ',
		attribution: '森林文化アカデミー',
		location: '森林文化アカデミー',
		minZoom: 10,
		maxZoom: 22,
		tags: ['鳥類'],
		bounds: [136.904003, 35.548892, 136.923042, 35.559113],
		mapImage: `${MAP_IMAGE_BASE_PATH}/fac_birds_census_2020.webp`,
		xyzImageTile: { x: 115387, y: 51671, z: 17 },
		coverImage: `${COVER_IMAGE_BASE_PATH}/bird.webp`
	},
	properties: {
		attributeView: {
			popupKeys: [
				'courseID',
				'countryCode',
				'basisOfRecord',
				'class',
				'countryCode',
				'courseID',
				'courseName',
				'decimalLatitude',
				'decimalLongitude',
				'eventDate',
				'eventID',
				'evidenceType',
				'geodeticDatum',
				'kingdom',
				'locality',
				'occurrenceID',
				'occurrenceRemarks',
				'occurrenceStatus',
				'reviewNote',
				'reviewStatus',
				'sourceRecordID',
				'timeZoneStatus',
				'verbatimEventDate',
				'verbatimIdentification',
				'vernacularName'
			],
			titles: [
				{
					conditions: ['vernacularName'],
					template: '{vernacularName}'
				},
				{
					conditions: [],
					template: '鳥類'
				}
			],
			relations: {
				iNaturalistNameKey: 'vernacularName'
			}
		},
		fields: [
			{
				key: 'basisOfRecord',
				label: 'basisOfRecord'
			},
			{
				key: 'class',
				label: 'class'
			},
			{
				key: 'countryCode',
				label: 'countryCode'
			},
			{
				key: 'courseID',
				label: 'courseID'
			},
			{
				key: 'courseName',
				label: 'courseName'
			},
			{
				key: 'decimalLatitude',
				label: 'decimalLatitude'
			},
			{
				key: 'decimalLongitude',
				label: 'decimalLongitude'
			},
			{
				key: 'eventDate',
				label: 'eventDate'
			},
			{
				key: 'eventID',
				label: 'eventID'
			},
			{
				key: 'evidenceType',
				label: 'evidenceType'
			},
			{
				key: 'geodeticDatum',
				label: 'geodeticDatum'
			},
			{
				key: 'kingdom',
				label: 'kingdom'
			},
			{
				key: 'locality',
				label: 'locality'
			},
			{
				key: 'occurrenceID',
				label: 'occurrenceID'
			},
			{
				key: 'occurrenceRemarks',
				label: 'occurrenceRemarks'
			},
			{
				key: 'occurrenceStatus',
				label: 'occurrenceStatus'
			},
			{
				key: 'reviewNote',
				label: 'reviewNote'
			},
			{
				key: 'reviewStatus',
				label: 'reviewStatus'
			},
			{
				key: 'sourceRecordID',
				label: 'sourceRecordID'
			},
			{
				key: 'timeZoneStatus',
				label: 'timeZoneStatus'
			},
			{
				key: 'verbatimEventDate',
				label: 'verbatimEventDate'
			},
			{
				key: 'verbatimIdentification',
				label: 'verbatimIdentification'
			},
			{
				key: 'vernacularName',
				label: 'vernacularName'
			}
		]
	},
	interaction: {
		clickable: true
	},
	style: {
		type: 'circle',
		opacity: 0.7,
		colors: {
			show: true,
			key: '単色',
			expressions: [
				{
					type: 'single',
					key: '単色',
					name: '単色',
					mapping: {
						value: '#fdb462',
						pattern: null
					}
				}
			]
		},
		radius: {
			key: '単一',
			expressions: [
				{
					type: 'single',
					key: '単一',
					name: '単一',
					mapping: {
						value: 8
					}
				}
			]
		},
		outline: {
			show: true,
			color: '#ffffff',
			width: 2
		},
		labels: {
			key: 'vernacularName',
			show: true,
			expressions: [
				{
					key: 'basisOfRecord',
					name: 'basisOfRecord'
				},
				{
					key: 'class',
					name: 'class'
				},
				{
					key: 'countryCode',
					name: 'countryCode'
				},
				{
					key: 'courseID',
					name: 'courseID'
				},
				{
					key: 'courseName',
					name: 'courseName'
				},
				{
					key: 'decimalLatitude',
					name: 'decimalLatitude'
				},
				{
					key: 'decimalLongitude',
					name: 'decimalLongitude'
				},
				{
					key: 'eventDate',
					name: 'eventDate'
				},
				{
					key: 'eventID',
					name: 'eventID'
				},
				{
					key: 'evidenceType',
					name: 'evidenceType'
				},
				{
					key: 'geodeticDatum',
					name: 'geodeticDatum'
				},
				{
					key: 'kingdom',
					name: 'kingdom'
				},
				{
					key: 'locality',
					name: 'locality'
				},
				{
					key: 'occurrenceID',
					name: 'occurrenceID'
				},
				{
					key: 'occurrenceRemarks',
					name: 'occurrenceRemarks'
				},
				{
					key: 'occurrenceStatus',
					name: 'occurrenceStatus'
				},
				{
					key: 'reviewNote',
					name: 'reviewNote'
				},
				{
					key: 'reviewStatus',
					name: 'reviewStatus'
				},
				{
					key: 'sourceRecordID',
					name: 'sourceRecordID'
				},
				{
					key: 'timeZoneStatus',
					name: 'timeZoneStatus'
				},
				{
					key: 'verbatimEventDate',
					name: 'verbatimEventDate'
				},
				{
					key: 'verbatimIdentification',
					name: 'verbatimIdentification'
				},
				{
					key: 'vernacularName',
					name: 'vernacularName'
				}
			]
		},
		default: {
			symbol: DEFAULT_POINT_LABEL_STYLE
		}
	}
};

export default entry;
