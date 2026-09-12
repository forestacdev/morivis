import type { IEntity, IPoint } from 'dxf-parser';
import type DxfArrayScanner from 'dxf-parser/dist/DxfArrayScanner';
import type { IGroup } from 'dxf-parser/dist/DxfArrayScanner';
import { checkCommonEntityProperties } from 'dxf-parser/dist/ParseHelpers.js';

type FaceEntity = IEntity & { vertices: Partial<IPoint>[]; invisibleEdgeFlags: number; };

/** dxf-parser 1.1.2の3DFACE処理を置き換え、末尾の属性で最後の頂点が失われるのを防ぐ。 */
export class DxfFaceHandler {
	readonly ForEntityName = '3DFACE' as const;

	parseEntity = (scanner: DxfArrayScanner, _start: IGroup): FaceEntity => {
		const entity = {
			type: this.ForEntityName,
			vertices: [],
			invisibleEdgeFlags: 0
		} as unknown as FaceEntity;
		let group = scanner.next();
		while (!scanner.isEOF() && group.code !== 0) {
			const { code, value } = group;
			const axis = code >= 10 && code <= 13
				? 'x'
				: code >= 20 && code <= 23
				? 'y'
				: code >= 30 && code <= 33
				? 'z'
				: null;
			if (axis) {
				// グループコードで頂点を特定するため、属性の位置や座標の並び順に依存しない。
				const vertex = entity.vertices[code % 10] ??= {};
				vertex[axis] = value as number;
			} else if (code === 70) {
				entity.invisibleEdgeFlags = value as number;
			} else {
				checkCommonEntityProperties(entity, group, scanner);
			}
			group = scanner.next();
		}
		// 次のエンティティの開始コードは、他のhandler同様にlastReadGroupへ残す。
		return entity;
	};
}
