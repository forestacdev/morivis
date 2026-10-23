const userAgent = process.env.npm_config_user_agent;
// pnpm の install lifecycle では user agent が渡らない場合がある。
const executable = process.env.npm_execpath?.split(/[/\\]/u).at(-1) ?? '';
const isPnpm = userAgent
	? userAgent.startsWith('pnpm/')
	: /^pnpm(?:\.[cm]?js)?$/u.test(executable);

if (!isPnpm) {
	console.error('依存関係はリポジトリのルートで pnpm install を実行してインストールしてください。');
	process.exitCode = 1;
}
