# SVGコンポーネント

UIアイコンはこのディレクトリのSvelteコンポーネントを使用する。Iconify APIからの取得、SVG文字列のHTML挿入は行わない。

固定のアイコンは直接importする。`class`、`width`、`height`などのSVG属性を指定できる。

```svelte
<script lang="ts">
  import CloseIcon from '$lib/components/svgs/icons/ui/CloseIcon.svelte';
</script>

<CloseIcon class="h-6 w-6 text-base" />
```

メニューのデータや状態に応じて切り替える場合は `Icon.svelte` を使う。文字列名は `registry.ts` に静的importしたコンポーネントから選ぶ。未登録の名前は描画しない。`catalog.ts` の `ICONS` / `LAYER_ICONS` は共通アイコンのコンポーネントを持つ。

```svelte
<script lang="ts">
  import Icon from '$lib/components/svgs/Icon.svelte';
  import { getVisibilityIconName } from '$lib/components/svgs/catalog';
  let visible = $state(true);
</script>

<Icon icon={getVisibilityIconName(visible)} width={24} />
```

追加時は `icons/<セット名>/` にコンポーネントを置き、共通の `Svg.svelte` にSVG要素を子として渡す。動的な名前指定にも使う場合だけ `registry.ts` に登録する。画像内のIDを使う場合は複数配置時に衝突しないようにする。作者・ライセンスは [LICENSES.md](./LICENSES.md) に記録する。

省略時の高さは `1em`。幅のみ・高さのみを指定すると元の縦横比を保つ。装飾用のSVGは既定で `aria-hidden`、意味のあるSVGには `aria-label` を付ける。

`custom_element_props_identifier` の抑制は、現在のESLintプラグインが通常のSvelteコンポーネントもcustom elementとして検証するために付けている。実際のアプリではcustom elementとして使わない。
