<script lang="ts">
	interface Props {
		value: string;
		values: string[] | number[];
	}
	let { value = $bindable(), values }: Props = $props();
</script>

<select bind:value>
	{#each values as colorsExpressions (colorsExpressions.key)}
		<option value={values.key}>{values.name}</option>
		<!-- <label
					class="text z-20 flex w-full cursor-pointer items-center justify-between gap-2 rounded-md bg-gray-400 p-2"
					class:bg-green-600={colorsExpressions.key === colorStyle.key}
				>
					<input
						type="radio"
						bind:group={colorStyle.key}
						value={colorsExpressions.key}
						class="hidden"
					/>
					<div class="flex items-center gap-2">
						<Icon icon={getIconStyle(colorsExpressions.type)} width={20} />
						<span class="select-none">{colorsExpressions.name}</span>
					</div>
					{#if colorStyle.key === colorsExpressions.key}
						{#if colorsExpressions.type === 'single'}
							<button
								onclick={() => openColorOption(colorsExpressions.key)}
								class="h-[20px] w-[20px] rounded-full"
								aria-label="色の設定"
								style={createGradient(colorsExpressions)}
							></button>
						{:else}
							<button
								onclick={() => openColorOption(colorsExpressions.key)}
								class="grid h-full place-items-center transition-transform duration-150 {colorOptionKey ===
								colorsExpressions.key
									? 'rotate-180'
									: 'rotate-0'}"
								aria-label="色の設定"
							>
								<Icon icon="bxs:down-arrow" class="h-6 w-6" />
							</button>
						{/if}
					{/if}
				</label> -->
	{/each}
</select>

<style>
</style>
