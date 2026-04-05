<script lang="ts">
	interface Props {
		label: string;
		file: File | null;
		accept: string;
		error?: string;
		name: string;
		required?: boolean;
	}
	let {
		label,
		file = $bindable(),
		accept = $bindable(),
		error,
		name = $bindable(),
		required = false
	}: Props = $props();

	const inputFile = (e: Event) => {
		const fileData = (e.target as HTMLInputElement).files?.[0];
		if (fileData) {
			file = fileData;
			name = fileData.name;
		}
	};
</script>

<div class="relative">
	{#if !file}
		<div
			class="ripple-ring ripple-1"
			style="--ripple-color: {required ? '#ef4444' : '#facc15'}"
		></div>
		<div
			class="ripple-ring ripple-2"
			style="--ripple-color: {required ? '#ef4444' : '#facc15'}"
		></div>
	{:else}
		<div class="set-ring"></div>
	{/if}
	<label
		class="text-main relative flex aspect-square w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-full bg-white {file
			? 'set-glow'
			: ''}"
		><span class="absolute text-xl">{label}</span>

		<div class="p-12"></div>

		<!-- <span class="absolute bottom-0 text-sm text-red-500">{error ? error : ''}</span> -->
		<input type="file" {accept} class="hidden" onchange={(e) => inputFile(e)} />
	</label>
</div>

<style>
	.ripple-ring {
		position: absolute;
		inset: 0;
		border-radius: 9999px;
		border: 2px solid var(--ripple-color, #facc15);
		opacity: 0;
		pointer-events: none;
	}

	.ripple-1 {
		animation: ripple 2s linear infinite;
	}

	.ripple-2 {
		animation: ripple 2s 1s linear infinite;
	}

	.set-ring {
		position: absolute;
		inset: -15px;
		border-radius: 9999px;
		border: 3px solid var(--color-accent);
		opacity: 0.8;
		pointer-events: none;
		filter: drop-shadow(0 0 5px #24fff4);
	}

	.set-glow {
		filter: drop-shadow(0 0 5px #24fff4);
	}

	@keyframes ripple {
		0% {
			transform: scale(1);
			opacity: 0.7;
		}
		100% {
			transform: scale(1.8);
			opacity: 0;
		}
	}
</style>
