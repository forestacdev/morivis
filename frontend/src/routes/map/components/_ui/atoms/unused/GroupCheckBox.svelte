<script setup lang="ts">
	export let label: string;
	export let value: string | number; // `boolean` は必要ない
	export let group: (string | number)[]; // 型を厳密に定義
</script>

<label class="flex flex-grow cursor-pointer gap-2">
	<span>{label}</span>
	<input type="checkbox" class="custom-checkbox" bind:group bind:value />
</label>
