<script lang="ts">
	import Icon from '@iconify/svelte';
	import { indexOf } from 'es-toolkit/compat';
	import gsap from 'gsap';
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

	onMount(() => {
		// 初期のMapbox式を受け取り、オブジェクト形式に変換する
		// isSide.set('base');
	});
	const initialExpression = [
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

	const initialExpression2 = [
		'interpolate',
		['linear'],
		['get', '面積'],
		0,
		'#f8d5cc',
		1,
		'#6e40e6',
		'#00000000' // デフォルトカラー
	];

	// Mapbox式からオブジェクトに変換
	const parseExpression = (expression) => {
		const mapping = {};
		for (let i = 2; i < expression.length - 1; i += 2) {
			mapping[expression[i]] = expression[i + 1];
		}
		// デフォルト値は別途保存
		const defaultValue = expression[expression.length - 1];
		console.log('mapping:', mapping);
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

	// 初期データをオブジェクト形式に変換して格納
	const state = $state({
		...parseExpression(initialExpression)
	});

	// Mapbox式を更新する関数
	const updateStyle = () => {
		const updatedExpression = generateExpression(state);

		console.log('updatedExpression:', updatedExpression);
		// Mapbox GL JS のレイヤー設定を更新
		mapStore.getMap().setPaintProperty('ENSYURIN_rinhanzu', 'fill-color', updatedExpression);
	};

	// let test = $state([
	// 	'match',
	// 	['get', '樹種'],
	// 	'スギ',
	// 	'#FFB6C1',
	// 	'ヒノキ',
	// 	'#ADD8E6',
	// 	'アカマツ',
	// 	'#90EE90',
	// 	'スラッシュマツ',
	// 	'#FFD700',
	// 	'広葉樹',
	// 	'#D2691E',
	// 	'草地',
	// 	'#98FB98',
	// 	'その他岩石',
	// 	'#A9A9A9',
	// 	'#FFFFFF' // デフォルトカラー（該当しない場合）
	// ]);
</script>

<div class="bg-main absolute z-10 w-[200px] p-2">
	<button class="w-full bg-gray-200 p-2 text-left" on:click={() => toggleMenu('base')}>
		<Icon icon="ic:round-menu" /></button
	>

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

<style>
</style>
