<script lang="ts">
	import RangeSlider from '$routes/map/components/atoms/RangeSlider.svelte';

	import Switch from '$routes/map/components/atoms/Switch.svelte';
	import type { StreetViewPoint } from '$routes/map/types/street-view';

	// デバッグ用
	// デバッグ用GUI設定
	// const advancedLighting = {
	// 	inputGamma: 2.2, // 入力画像のガンマ値
	// 	outputGamma: 2.2, // 出力のガンマ値
	// 	exposure: 0.6,
	// 	brightness: 1.5, // 追加の明度調整
	// 	contrast: 1.5 // コントラスト調整
	// };

	// // ガンマ調整（1.8-2.6程度が一般的）
	// gui
	// 	.add(advancedLighting, 'inputGamma', 1.5, 3.0, 0.1)
	// 	.onChange((value) => {
	// 		uniforms.gamma.value = value;
	// 	})
	// 	.name('inputGamma');
	// gui
	// 	.add(advancedLighting, 'outputGamma', 1.5, 3.0, 0.1)
	// 	.onChange((value) => {
	// 		uniforms.outputGamma.value = value;
	// 	})
	// 	.name('outputGamma');

	// // 明るさ調整
	// gui
	// 	.add(advancedLighting, 'brightness', 0.0, 2.0, 0.1)
	// 	.onChange((value) => {
	// 		uniforms.brightness.value = value;
	// 	})
	// 	.name('Brightness');
	// // コントラスト調整
	// gui
	// 	.add(advancedLighting, 'contrast', 0.0, 2.0, 0.1)
	// 	.onChange((value) => {
	// 		uniforms.contrast.value = value;
	// 	})
	// 	.name('Contrast');

	// // 露出調整
	// gui
	// 	.add(advancedLighting, 'exposure', -1.0, 2.0, 0.1)
	// 	.onChange((value) => {
	// 		uniforms.exposure.value = value;
	// 	})
	// 	.name('Exposure');

	interface Props {
		angleX: number;
		angleY: number;
		angleZ: number;
		showWireframe: boolean; // デバッグ用ワイヤーフレーム表示
		streetViewPoint: StreetViewPoint | null;
	}

	let {
		angleX = $bindable(),
		angleY = $bindable(),
		angleZ = $bindable(),
		showWireframe = $bindable(),
		streetViewPoint
	}: Props = $props();

	const copyAngle = () => {
		if (!streetViewPoint) return;

		// クリップボードに角度をjson textでコピー
		const angleDataContent = `"${streetViewPoint.properties.photo_id}": {
            "angle_x": ${angleX},
            "angle_y": ${angleY},
            "angle_z": ${angleZ}
        }`;

		navigator.clipboard
			.writeText(angleDataContent)
			.then(() => {
				console.log('角度データをクリップボードにコピーしました:', angleDataContent);
			})
			.catch((err) => {
				console.error('クリップボードへのコピーに失敗しました:', err);
			});
	};
</script>

<div class="absolute right-2 top-2 w-[400px] bg-black/50 p-2">
	<div class="flex flex-col gap-2">
		<RangeSlider label="Angle X" bind:value={angleX} min={0} max={360} step={0.01} />
		<RangeSlider label="Angle Y" bind:value={angleY} min={0} max={360} step={0.01} />
		<RangeSlider label="Angle Z" bind:value={angleZ} min={0} max={360} step={0.01} />
		<Switch label="Show Wireframe" bind:value={showWireframe} />
		<button class="c-btn-confirm" onclick={copyAngle}>Copy Angle</button>
	</div>
</div>
