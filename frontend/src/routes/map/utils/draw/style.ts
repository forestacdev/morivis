import type { StyleSpecification } from '$routes/map/utils/maplibre';

export const DRAW_RUNTIME_PREFIX = 'morivis-draw';

/** 編集中の一時レイヤーはTerra Drawが所有し、通常のstyle再生成をまたいで保持する。 */
export const preserveDrawStyle = (
	previous: StyleSpecification | undefined,
	next: StyleSpecification
): StyleSpecification => ({
	...next,
	sources: {
		...next.sources,
		...Object.fromEntries(
			Object.entries(previous?.sources ?? {}).filter(([id]) =>
				id.startsWith(`${DRAW_RUNTIME_PREFIX}-`)
			)
		)
	},
	layers: [
		...next.layers,
		...(previous?.layers ?? []).filter(layer => layer.id.startsWith(`${DRAW_RUNTIME_PREFIX}-`))
	]
});
