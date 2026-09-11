import { ENTRY_DATA_PATH } from '$routes/constants';
import { createGlbEntry } from '$routes/map/data/entries/model';

const baseEntry = createGlbEntry(
	'サンプルIFCデータ 構造',
	`${ENTRY_DATA_PATH}/ifc/07_サンプルIFCデータ_構造.ifc`,
	{
		lng: -71.25807189916667,
		lat: 42.41486358638889,
		altitude: 0
	},
	'ifc',
	undefined,
	undefined,
	{ normalizeToLocalOrigin: true, sourceFileName: '07_サンプルIFCデータ_構造.ifc' }
);

const entry = {
	...baseEntry,
	id: 'sample_ifc_timber_structure',
	properties: {
		ifc: {
			extractionProfiles: [
				{
					type: 'part-colors',
					elementTypes: ['IFCBEAM', 'IFCCOLUMN', 'IFCWALL', 'IFCSLAB'],
					attributeKeys: [
						'IFC クラス',
						'JPPset_TimberElementGeneral.ProductName',
						'JPPset_TimberElementGeneral.TimberSpecies',
						'JPPset_TimberElementGeneral.StrengthClass',
						'JPPset_TimberFrameDimension.StartingStorey',
						'JPPset_TimberFrameDimension.Width',
						'JPPset_TimberFrameDimension.Height',
						'Pset_BeamCommon.Span',
						'Qto_BeamBaseQuantities.NetVolume',
						'Qto_ColumnBaseQuantities.NetVolume',
						'Qto_WallBaseQuantities.NetVolume'
					]
				}
			]
		}
	},
	metaData: {
		...baseEntry.metaData,
		description: '木造部材の属性を含むIFC構造モデル。部材属性と色分けの確認に利用できる。',
		attribution: 'カスタムデータ',
		location: 'サンプルIFC構造モデル',
		bounds: [-71.2601, 42.4129, -71.2561, 42.4169],
		tags: ['3Dモデル', 'IFC']
	}
};

export default entry;
