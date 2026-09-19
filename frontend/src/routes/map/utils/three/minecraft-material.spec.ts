import { MeshStandardMaterial } from 'three';
import { describe, expect, it } from 'vitest';
import { minecraftMaterialState } from './minecraft-material';

describe('Minecraft材質のスタイル適用', () => {
	it('切り抜きは深度を書き、半透明は深度を書かず、元のアルファを保持する', () => {
		const source = new MeshStandardMaterial({ alphaTest: 0.1 });
		source.userData.morivisMinecraftMaterial = true;
		expect(minecraftMaterialState(source, 1)).toMatchObject({
			alphaTest: 0.1,
			transparent: false,
			depthWrite: true
		});
		source.transparent = true;
		source.opacity = 0.4;
		expect(minecraftMaterialState(source, 0.5)).toMatchObject({
			sourceOpacity: 0.4,
			transparent: true,
			depthWrite: false
		});
	});
	it('不透明なMinecraft材質もレイヤー透過率に追従し、他形式の既存設定を保つ', () => {
		const source = new MeshStandardMaterial();
		expect(minecraftMaterialState(source, 1)).toMatchObject({
			enabled: false,
			transparent: true,
			depthWrite: true
		});
		source.userData.morivisMinecraftMaterial = true;
		expect(minecraftMaterialState(source, 0.5)).toMatchObject({
			transparent: true,
			depthWrite: false
		});
		expect(minecraftMaterialState(source, 1)).toMatchObject({
			transparent: false,
			depthWrite: true
		});
	});
});
