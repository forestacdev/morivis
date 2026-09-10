import { describe, expect, it } from 'vitest';

import { formatFbxMetadataDescription, parseFbxFileMetadata } from './fbx-metadata';

const ASCII_FBX = `
FBXHeaderExtension:  {
	FBXVersion: 7400
	Creator: "test-exporter 1.2"
	SceneInfo: "GlobalInfo", "UserData" {
		Properties70:  {
			P: "Original|ApplicationVendor", "KString", "", "", "test-vendor"
			P: "Original|ApplicationName", "KString", "", "", "test-source-app"
			P: "Original|ApplicationVersion", "KString", "", "", "3.4"
			P: "Original|DateTime_GMT", "DateTime", "", "", "2001-02-03 04:05:06"
			P: "Original|FileName", "KString", "", "", "C:\\\\test-data\\\\test-source.dwg"
			P: "LastSaved|ApplicationName", "KString", "", "", "test-save-app"
			P: "LastSaved|ApplicationVersion", "KString", "", "", "5.6"
		}
	}
}
GlobalSettings:  {
	Properties70:  {
		P: "UpAxis", "int", "Integer", "",2
		P: "UpAxisSign", "int", "Integer", "",1
		P: "FrontAxis", "int", "Integer", "",1
		P: "FrontAxisSign", "int", "Integer", "",-1
		P: "CoordAxis", "int", "Integer", "",0
		P: "CoordAxisSign", "int", "Integer", "",1
		P: "UnitScaleFactor", "double", "Number", "",100
	}
}
Objects:  {
	Model: 1, "Model::test-root", "Null" {
	}
	Geometry: 2, "Geometry::test-mesh", "Mesh" {
	}
	Geometry: 3, "Geometry::test-curve", "NurbsCurve" {
	}
	Material: 4, "Material::test-material", "" {
	}
}
`;

describe('FBX metadata', () => {
	it('ASCII FBXの生成ソフト・座標系・構成を取得する', () => {
		const buffer = new TextEncoder().encode(ASCII_FBX).buffer;
		const metadata = parseFbxFileMetadata(buffer);

		expect(metadata).toMatchObject({
			encoding: 'ascii',
			version: 7400,
			creator: 'test-exporter 1.2',
			originalApplication: {
				vendor: 'test-vendor',
				name: 'test-source-app',
				version: '3.4'
			},
			lastSavedApplication: {
				name: 'test-save-app',
				version: '5.6'
			},
			createdAt: '2001-02-03 04:05:06',
			originalFileName: 'test-source.dwg',
			coordinateSystem: {
				upAxis: { axis: 'Z', sign: 1 },
				frontAxis: { axis: 'Y', sign: -1 },
				coordinateAxis: { axis: 'X', sign: 1 },
				unitScaleFactor: 100,
				unitScaleMeters: 1
			},
			contents: {
				modelCount: 1,
				geometryCount: 2,
				materialCount: 1,
				geometryTypes: { Mesh: 1, NurbsCurve: 1 }
			}
		});
	});

	it('FBX情報をBaseMetaData.description用の文字列へまとめる', () => {
		const buffer = new TextEncoder().encode(ASCII_FBX).buffer;
		const description = formatFbxMetadataDescription(
			parseFbxFileMetadata(buffer),
			buffer.byteLength
		);

		expect(description).toMatch(/^ASCII FBX 7400、/);
		expect(description).not.toContain('FBX形式の3Dモデル');
		expect(description).toContain('生成ツール: test-exporter 1.2');
		expect(description).toContain('変換元: test-vendor test-source-app 3.4');
		expect(description).toContain('Z-up');
		expect(description).toContain('1単位=1 m');
		expect(description).toContain('内訳: Mesh 1件、NurbsCurve 1件');
	});
});
