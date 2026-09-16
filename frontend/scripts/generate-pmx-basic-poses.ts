import { mkdir, writeFile } from 'node:fs/promises';
import * as THREE from 'three';

// ボーン名・階層の参考資料は static/poses/pmx/README.md に記載。
// 角度はmorivis用の作画値であり、男女の身体寸法や関節可動域を表すものではない。
const bones = [
	'全ての親',
	'センター',
	'グルーブ',
	'下半身',
	'上半身',
	'上半身2',
	'首',
	'頭',
	'左肩',
	'右肩',
	'左腕',
	'右腕',
	'左ひじ',
	'右ひじ',
	'左手首',
	'右手首',
	'左足',
	'右足',
	'左ひざ',
	'右ひざ',
	'左足首',
	'右足首'
];
const outputDirectory = new URL('../static/poses/pmx/', import.meta.url);
await mkdir(outputDirectory, { recursive: true });

for (const variant of ['common', 'male', 'female'] as const) {
	for (const pose of ['standing', 'sitting', 'lying'] as const) {
		const rotations: Record<string, [number, number, number]> = {};
		const translations: Record<string, [number, number, number]> = {};
		const armAngle = variant === 'male'
			? (pose === 'lying' ? 35 : 40)
			: variant === 'female'
			? 50
			: 45;
		for (const [prefix, side] of [['左', 1], ['右', -1]] as const) {
			rotations[`${prefix}腕`] = [0, 0, -side * armAngle];
			if (pose === 'sitting') {
				// Y回転の後に股関節を曲げ、脚の開きと膝の曲げを別々に指定する。
				const spread = variant === 'male' ? 12 : variant === 'female' ? -6 : 0;
				rotations[`${prefix}足`] = [90, -side * spread, 0];
				rotations[`${prefix}ひざ`] = [-90, 0, 0];
				rotations[`${prefix}ひじ`] = [
					variant === 'male' ? 45 : variant === 'female' ? 60 : 15,
					0,
					0
				];
			} else {
				const spread = variant === 'male'
					? (pose === 'lying' ? 8 : 6)
					: variant === 'female'
					? -2
					: 0;
				rotations[`${prefix}足`] = [0, 0, side * spread];
				if (pose === 'lying' && variant !== 'common') {
					rotations[`${prefix}ひじ`] = [variant === 'male' ? 8 : 15, 0, 0];
				}
			}
		}
		if (pose === 'sitting') translations['センター'] = [0, -4.5, 0];
		if (pose === 'lying') {
			translations['センター'] = [0, -9, 0];
			rotations['センター'] = [90, 0, 0];
		}
		const lines = ['Vocaloid Pose Data file', '', 'morivis-basic.pmx;', `${bones.length};`, ''];
		bones.forEach((name, index) => {
			const [x, y, z] = rotations[name] ?? [0, 0, 0];
			const rotation = new THREE.Quaternion().setFromEuler(
				new THREE.Euler(
					THREE.MathUtils.degToRad(x),
					THREE.MathUtils.degToRad(y),
					THREE.MathUtils.degToRad(z),
					'YXZ'
				)
			);
			const translation = translations[name] ?? [0, 0, 0];
			lines.push(
				`Bone${index}{${name}`,
				`${translation.map((value) => value.toFixed(8)).join(',')};`,
				`${rotation.toArray().map((value) => value.toFixed(8)).join(',')};`,
				'}',
				''
			);
		});
		const fileName = variant === 'common' ? `${pose}.vpd` : `${variant}-${pose}.vpd`;
		await writeFile(new URL(fileName, outputDirectory), lines.join('\n'), 'utf8');
	}
}
