<script lang="ts">
	import { page } from '$app/state';

	// トップページへのリダイレクト
	if (import.meta.env.MODE === 'production') {
		window.location.href = '/morivis';
	}
</script>

<h3>Requested page path is {page.url.pathname}</h3>
