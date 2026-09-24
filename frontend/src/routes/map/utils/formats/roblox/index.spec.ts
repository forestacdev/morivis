import { describe, expect, it } from 'vitest';
import { frameXml, partXml, sizeXml, testWorld, worldXml } from './__fixtures__/world';
import { parseRbxlx } from './index';

describe('Roblox XMLワールド', () => {
	it('Studioのプロパティ名から配置・サイズ・符号付き座標・色を読む', () => {
		expect(parseRbxlx(testWorld)).toEqual({
			parts: [{
				shape: 'block',
				size: [2, 4, 6],
				position: [10, 4, -8],
				rotation: [1, 0, 0, 0, 1, 0, 0, 0, 1],
				color: [1, 0, 0],
				opacity: 1
			}],
			warnings: []
		});
	});
	it('入れ子のModelのCFrameを足さず、Workspace外のパーツを除外する', () => {
		const model = partXml(frameXml(500, 500, 500), partXml(frameXml()), 'Model');
		const outside = partXml('', partXml(), 'ServerStorage');
		const world = parseRbxlx(worldXml(model, outside));
		expect(world.parts).toHaveLength(1);
		expect(world.parts[0].position).toEqual([10, 4, -8]);
	});
	it.each([[0, 'ball'], [1, 'block'], [2, 'cylinder'], [3, 'wedge']] as const)(
		'PartType %sを%sとして読む',
		(token, shape) => {
			expect(
				parseRbxlx(worldXml(partXml(`<token name="shape">${token}</token>`))).parts[0].shape
			).toBe(shape);
		}
	);
	it('WedgePart、透明度と浮動小数点の色を読む', () => {
		const part = parseRbxlx(
			worldXml(
				partXml(
					'<float name="Transparency">0.6</float><Color3 name="Color"><R>0.2</R><G>0.4</G><B>0.8</B></Color3>',
					'',
					'WedgePart'
				)
			)
		).parts[0];
		expect(part.shape).toBe('wedge');
		expect(part.opacity).toBeCloseTo(0.4);
		expect(part.color).toEqual([0.2, 0.4, 0.8]);
	});
	it('完全透明なパーツを出力しない', () => {
		const world = parseRbxlx(
			worldXml(partXml() + partXml('<float name="Transparency">1</float>'))
		);
		expect(world.parts).toHaveLength(1);
	});
	it('巨大な水平Baseplateを除外し、その子パーツは残す', () => {
		const baseplate = partXml(
			'<string name="Name">Baseplate</string>' + sizeXml(768, 12, 640),
			partXml(sizeXml(8, 2, 8), '', 'SpawnLocation')
		);
		const world = parseRbxlx(worldXml(baseplate));
		expect(world.parts.map(part => part.size)).toEqual([[8, 2, 8]]);
		expect(world.warnings).toEqual([]);
	});
	it.each(
		[
			['通常の床', 'Part', 'Floor', [768, 12, 640], undefined],
			['小さなBaseplate', 'Part', 'Baseplate', [24, 2, 32], undefined],
			['厚みのある構造物', 'Part', 'Baseplate', [768, 320, 640], undefined],
			['垂直の壁', 'Part', 'Baseplate', [768, 12, 640], [1, 0, 0, 0, 0, -1, 0, 1, 0]],
			['地面メッシュ', 'MeshPart', 'Baseplate', [768, 12, 640], undefined]
		] as const
	)('%sを除外しない', (_label, className, name, size, rotation) => {
		const properties = `<string name="Name">${name}</string>` + sizeXml(...size)
			+ frameXml(0, 0, 0, rotation ? [...rotation] : undefined)
			+ (className === 'MeshPart'
				? '<Content name="MeshId"><url>rbxassetid://12345</url></Content>'
				: '');
		expect(parseRbxlx(worldXml(partXml(properties, '', className))).parts).toHaveLength(1);
	});
	it('未設定メッシュ・Terrainを集計し、メッシュ付きPartを箱で偽装しない', () => {
		const world = parseRbxlx(
			worldXml(
				partXml() + partXml('', '', 'MeshPart')
					+ partXml('', partXml('', '', 'SpecialMesh')) + partXml('', '', 'Decal')
					+ partXml(
						'<BinaryString name="SmoothGrid">dGVzdA==</BinaryString>',
						'',
						'Terrain'
					)
			)
		);
		expect(world.parts).toHaveLength(1);
		expect(world.warnings).toEqual(
			expect.arrayContaining([
				'MeshPart（MeshIdなし）: 1件',
				'Terrain: 1件',
				'メッシュ付きPart: 1件'
			])
		);
	});
	it.each([
		'<wrong/>',
		'<roblox version="3"/>',
		'<roblox version="4"><Item>',
		'<!DOCTYPE roblox><roblox version="4"/>'
	])('不正なXMLを拒否する', xml => {
		expect(() => parseRbxlx(xml)).toThrow();
	});
	it('対応パーツがない場合は原因を返す', () => {
		expect(() => parseRbxlx(worldXml(partXml('', '', 'MeshPart')))).toThrow(
			/基本パーツ.*MeshPart/
		);
	});
	it.each([sizeXml(-1), sizeXml(NaN), frameXml(Infinity)])(
		'不正な数値でモデルを生成しない',
		properties => {
			expect(() => parseRbxlx(worldXml(partXml(properties)))).toThrow();
		}
	);
});
