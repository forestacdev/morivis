<script lang="ts">
	import Icon from '@iconify/svelte';
	import { indexOf } from 'es-toolkit/compat';
	import gsap from 'gsap';
	import type { DataDrivenPropertyValueSpecification, ColorSpecification } from 'maplibre-gl';
	import { onMount } from 'svelte';

	import { isSide } from '$map/store';
	import { mapStore } from '$map/store/map';

	const toggleMenu = (key) => {
		console.log('key:', key);
		if (key === $isSide) {
			isSide.set(null);
		} else {
			isSide.set(key);
		}
	};

	const matchExpression: DataDrivenPropertyValueSpecification<ColorSpecification> = [
		'match',
		['get', '樹種'],
		'スギ',
		'#FFB6C1',
		'ヒノキ',
		'#ADD8E6',
		'アカマツ',
		'#90EE90',
		'スラッシュマツ',
		'#FFD700',
		'広葉樹',
		'#D2691E',
		'草地',
		'#98FB98',
		'その他岩石',
		'#A9A9A9',
		'#FFFFFF' // デフォルトカラー
	];

	const interpolateExpression: DataDrivenPropertyValueSpecification<ColorSpecification> = [
		'case',
		['==', ['coalesce', ['get', '林齢'], -9999], -9999], // '林齢' が null または undefined の場合
		'#00000000', // -9999 に対応する色
		[
			'interpolate',
			['linear'],
			['coalesce', ['to-number', ['get', '林齢'], -9999], -9999], // '林齢' が数値でない場合に -9999 を使用
			0,
			'#eb0000',
			50,
			'#00eb85',
			80,
			'#6e40e6'
		]
	];

	const caseExpression: DataDrivenPropertyValueSpecification<ColorSpecification> =
		// -9999 に対応する色（透明色）
		[
			'step',
			['coalesce', ['to-number', ['get', '面積'], -9999], -9999], // '林齢' が null や非数値の場合に -9999 を使用
			'#00000000', // デフォルトカラー（0 以下の場合の色）
			0,
			'red', // 0 の場合
			1,
			'#6e40e6' // 80 以上の場合の色
		];

	interface ExpressionColorData {
		[name: string]: {
			type: 'match' | 'interpolate' | 'case';
			expression: DataDrivenPropertyValueSpecification<ColorSpecification>;
		};
	}

	interface Memory {
		mapping: Record<string | number, ColorSpecification>;
		default: ColorSpecification;
	}

	const expressionColorData: ExpressionColorData = {
		['樹種']: {
			type: 'match',
			expression: matchExpression
		},
		['林齢']: {
			type: 'interpolate',
			expression: interpolateExpression
		},
		['面積']: {
			type: 'case',
			expression: caseExpression
		}
	};

	onMount(() => {
		// 初期のMapbox式を受け取り、オブジェクト形式に変換する
		// isSide.set('base');
	});

	// Mapbox式からオブジェクトに変換
	const parseExpression = (expression) => {
		const mapping = {};
		for (let i = 2; i < expression.length - 1; i += 2) {
			mapping[expression[i]] = expression[i + 1];
		}
		// デフォルト値は別途保存
		const defaultValue = expression[expression.length - 1];
		return { mapping, default: defaultValue };
	};

	// オブジェクトからMapbox式を生成
	const generateExpression = ({ mapping, default: defaultValue }) => {
		const expression = ['match', ['get', '樹種']];
		for (const [key, value] of Object.entries(mapping)) {
			expression.push(key, value);
		}
		expression.push(defaultValue); // デフォルト値を最後に追加
		return expression;
	};

	// let targetKeys = $state(Object.keys(expressionColorData));

	// 初期データをオブジェクト形式に変換して格納
	const state = $state({
		...parseExpression(expressionColorData['樹種'].expression)
	});

	// Mapbox式を更新する関数
	const updateStyle = (value) => {
		console.log('value:', value);
		const updatedExpression = generateExpression(state);

		console.log('updatedExpression:', updatedExpression);
		// Mapbox GL JS のレイヤー設定を更新
		mapStore.getMap().setPaintProperty('ENSYURIN_rinhanzu', 'fill-color', updatedExpression);
	};
</script>

<div class="bg-main absolute z-10 w-[200px] p-2">
	<select class="w-full bg-gray-200 p-2 text-left" on:change={(e) => updateStyle(e.target.value)}>
		{#each Object.keys(expressionColorData) as key}
			<option value={key}>{key}</option>
		{/each}
	</select>
	<div class="bg-main absolute z-10 w-[200px] p-2">
		<div class="bg-white p-2">
			<!-- オブジェクト形式のデータをループ -->
			{#each Object.entries(state.mapping) as [key, value]}
				<div class="mb-2 flex items-center justify-between">
					<span>{key === 'default' ? 'デフォルト' : key}</span>
					<input type="color" bind:value={state.mapping[key]} on:input={() => updateStyle()} />
				</div>
			{/each}
		</div>
	</div>
</div>

<!-- <button class="w-full bg-gray-200 p-2 text-left" on:click={() => toggleMenu('base')}>
		<Icon icon="ic:round-menu" /></button
	> -->
<style>
</style>
