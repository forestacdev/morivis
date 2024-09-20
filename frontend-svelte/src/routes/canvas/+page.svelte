<script lang="ts">
	import { onMount } from 'svelte';

	onMount(() => {
		// シェーダーコード
const width = 256; // 画像の幅
const height = 2;  // 画像の高さ（2ピクセル）

const canvas = document.querySelector('canvas');
canvas.width = width;
canvas.height = height;
const ctx = canvas.getContext('2d');

// グラデーションを作成
const gradient = ctx.createLinearGradient(0, 0, width, 0);
gradient.addColorStop(0 / 4000, "#2db4b4");
gradient.addColorStop(100 / 4000, "#71b42d");
gradient.addColorStop(300 / 4000, "#b4a72d");
gradient.addColorStop(1000 / 4000, "#b4562d");
gradient.addColorStop(2000 / 4000, "#b4491b");
gradient.addColorStop(4000 / 4000, "#b43d09");

// グラデーションを描画
ctx.fillStyle = gradient;
ctx.fillRect(0, 0, width, 1);

// 高度データを2行目に描画（オプション）
const imageData = ctx.getImageData(0, 1, width, 1);
for (let i = 0; i < width; i++) {
const height = i * (4000 / 255);
imageData.data[i * 4] = height & 255;
imageData.data[i * 4 + 1] = (height >> 8) & 255;
imageData.data[i * 4 + 2] = (height >> 16) & 255;
imageData.data[i * 4 + 3] = 255; // アルファ値
}
ctx.putImageData(imageData, 0, 1);

// canvasをデータURLに変換
const dataURL = canvas.toDataURL();
	});
</script>

<canvas class='w-[256px] h-[256px]'></canvas>

<style>
</style>
