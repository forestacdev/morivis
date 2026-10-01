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
				'vernacularName',
				'eventDate',
				'behavior',
				'morivis_courseName',
				'basisOfRecord',
				'locality',
				'morivis_evidenceType',
				'morivis_reviewNote',
				'morivis_reviewStatus',
				'morivis_timeZoneStatus',
				'occurrenceRemarks',
				'occurrenceStatus',
				'verbatimEventDate',
				'verbatimIdentification',
				'class',
				'kingdom',
				'decimalLongitude',
				'decimalLatitude',
				'geodeticDatum',
				'countryCode',
				'occurrenceID',
				'eventID',
				'morivis_sourceRecordID',
				'morivis_courseID'
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
			// 記録の識別・区分
			{
				key: 'occurrenceID',
				label: '観察ID'
			},
			{
				key: 'eventID',
				label: '調査ID'
			},
			{
				key: 'morivis_sourceRecordID',
				label: '元記録ID'
			},
			{
				key: 'basisOfRecord',
				label: '記録の根拠',
				type: 'string',
				valueDict: {
					HumanObservation: '人による観察',
					MachineObservation: '機械による観察'
				}
			},
			{
				key: 'occurrenceStatus',
				label: '生物の在・不在',
				valueDict: {
					present: '存在の記録',
					absent: '不在の記録'
				}
			},

			// 日時
			{
				key: 'eventDate',
				label: '記録日',
				type: 'date',
				format: {
					date: {
						inputPatterns: ['YYYY-MM-DD'],
						displayPattern: 'YYYY年MM月DD日'
					}
				}
			},
			{
				key: 'eventTime',
				label: '記録時刻'
			},
			{
				key: 'verbatimEventDate',
				label: '元の日時表記'
			},
			{
				key: 'morivis_timeZoneStatus',
				label: 'タイムゾーンの確認状況',
				valueDict: {
					known: '確認済み',
					unknown: '未確認',
					assumed: '仮定して変換'
				}
			},

			// 位置・環境
			{
				key: 'decimalLatitude',
				label: '緯度',
				type: 'number'
			},
			{
				key: 'decimalLongitude',
				label: '経度',
				type: 'number'
			},
			{
				key: 'geodeticDatum',
				label: '測地系'
			},
			{
				key: 'coordinateUncertaintyInMeters',
				label: '位置の不確かさ（m）',
				type: 'number'
			},
			{
				key: 'verbatimLatitude',
				label: '元の緯度表記'
			},
			{
				key: 'verbatimLongitude',
				label: '元の経度表記'
			},
			{
				key: 'countryCode',
				label: '国コード',
				valueDict: {
					JP: '日本'
				}
			},
			{
				key: 'locality',
				label: '場所'
			},
			{
				key: 'habitat',
				label: '環境'
			},

			// 分類・同定
			{
				key: 'kingdom',
				label: '界',
				valueDict: {
					Animalia: '動物界'
				}
			},
			{
				key: 'class',
				label: '綱',
				valueDict: {
					Aves: '鳥綱'
				}
			},
			{
				key: 'vernacularName',
				label: '和名・分類群名'
			},
			{
				key: 'scientificName',
				label: '学名'
			},
			{
				key: 'taxonRank',
				label: '分類階級'
			},
			{
				key: 'taxonID',
				label: '分類群ID'
			},
			{
				key: 'verbatimIdentification',
				label: '元の種名記述'
			},
			{
				key: 'identificationQualifier',
				label: '同定の留保',
				valueDict: {
					'?': '同定に疑問あり'
				}
			},
			{
				key: 'identificationRemarks',
				label: '同定の補足'
			},

			// 観察内容
			{
				key: 'individualCount',
				label: '個体数',
				type: 'integer'
			},
			{
				key: 'sex',
				label: '性別',
				valueDict: {
					male: '雄',
					female: '雌'
				}
			},
			{
				key: 'lifeStage',
				label: '成長段階'
			},
			{
				key: 'behavior',
				label: '行動'
			},
			{
				key: 'morivis_evidenceType',
				label: '証拠の種類',
				valueDict: {
					sighting: '目視',
					sound: '声',
					footprint: '足跡',
					nest: '巣',
					droppings: '糞',
					unknown: '不明'
				}
			},
			{
				key: 'recordedBy',
				label: '記録者'
			},
			{
				key: 'identifiedBy',
				label: '同定者'
			},
			{
				key: 'occurrenceRemarks',
				label: '観察の備考'
			},

			// 確認状況
			{
				key: 'morivis_duplicateGroupID',
				label: '重複候補グループID'
			},
			{
				key: 'morivis_reviewStatus',
				label: '確認状態',
				valueDict: {
					pending: '確認待ち',
					reviewed: '確認済み',
					excluded: '除外'
				}
			},
			{
				key: 'morivis_reviewNote',
				label: '確認メモ'
			},

			// 授業・開講
			{
				key: 'morivis_academicYear',
				label: '開講年度',
				type: 'integer'
			},
			{
				key: 'morivis_courseID',
				label: '授業ID'
			},
			{
				key: 'morivis_courseName',
				label: '授業名'
			},
			{
				key: 'morivis_courseOfferingID',
				label: '開講ID'
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
					key: 'morivis_courseID',
					name: 'morivis_courseID'
				},
				{
					key: 'morivis_courseName',
					name: 'morivis_courseName'
				},
				{
					key: 'morivis_evidenceType',
					name: 'morivis_evidenceType'
				},
				{
					key: 'morivis_reviewNote',
					name: 'morivis_reviewNote'
				},
				{
					key: 'morivis_reviewStatus',
					name: 'morivis_reviewStatus'
				},
				{
					key: 'morivis_sourceRecordID',
					name: 'morivis_sourceRecordID'
				},
				{
					key: 'morivis_timeZoneStatus',
					name: 'morivis_timeZoneStatus'
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
