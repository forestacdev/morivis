<script lang="ts">
	export let href: string;
</script>

<a {href}>
	<div class="relative h-full rounded-lg">
		<div id="map" class="h-full rounded-lg">
			<enhanced:img
				src="../../static/OGPimage.jpg"
				alt="地図画面へ"
				class="h-full w-full rounded-lg object-cover"
			/>
		</div>
		<div
			class="absolute left-1/2 top-1/2 z-10 h-full w-full -translate-x-1/2 -translate-y-1/2 rounded-lg bg-opacity-0 hover:bg-black hover:bg-opacity-20"
		>
			<div class="flex h-full w-full items-center justify-center">
				<span class="text-[30px] font-bold text-white [text-shadow:_0px_0px_10px_#000]"
					>地図を見てみる</span
				>
			</div>
		</div>
	</div>
</a>
