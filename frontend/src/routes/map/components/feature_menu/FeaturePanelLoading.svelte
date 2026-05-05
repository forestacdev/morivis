<script lang="ts">
	interface Props {
		containerClass?: string;
		label?: string;
	}

	let {
		containerClass = 'flex h-full w-full flex-col items-center justify-center gap-4',
		label = '読み込み中...'
	}: Props = $props();
</script>

<div class={containerClass}>
	<div class="border-t-accent h-12 w-12 animate-spin rounded-full border-4 border-gray-300"></div>
	<p class="text-gray-400">{label}</p>
</div>
