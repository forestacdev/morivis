import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';
import { expect, it, vi } from 'vitest';

const ghPages = createRequire(import.meta.url)('gh-pages') as {
	publish: (directory: string, options: Record<string, unknown>) => Promise<void>;
};

it('gh-pagesはローカルリポジトリへファイルを公開し、古いファイルを削除する', async () => {
	const cacheRoot = resolve(import.meta.dirname, '../node_modules/.cache');
	mkdirSync(cacheRoot, { recursive: true });
	const temp = mkdtempSync(join(cacheRoot, 'test-deploy-'));
	const remote = join(temp, 'test-remote.git');
	const source = join(temp, 'test-source');
	const build = join(temp, 'test-build');
	const git = (cwd: string, ...args: string[]) =>
		execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
			.trim();
	try {
		writeFileSync(join(temp, 'gitconfig'), '');
		vi.stubEnv('GIT_CONFIG_GLOBAL', join(temp, 'gitconfig'));
		vi.stubEnv('GIT_CONFIG_NOSYSTEM', '1');
		vi.stubEnv('CACHE_DIR', join(temp, 'cache'));
		git(temp, 'init', '--bare', remote);
		git(temp, 'init', '-b', 'test-main', source);
		git(source, 'config', 'user.name', 'test-user');
		git(source, 'config', 'user.email', 'test-user@example.invalid');
		writeFileSync(join(source, 'test-initial.txt'), 'test-initial');
		git(source, 'add', '.');
		git(source, 'commit', '-m', 'test-initial');
		git(source, 'push', remote, 'HEAD:gh-pages');
		cpSync(resolve(import.meta.dirname, '__fixtures__/test-deploy'), build, {
			recursive: true
		});
		const options = {
			repo: remote,
			branch: 'gh-pages',
			nojekyll: true,
			user: { name: 'test-user', email: 'test-user@example.invalid' },
			message: 'test-deploy',
			src: ['**/*', '!exclude.txt'],
			dotfiles: true
		};
		await ghPages.publish(build, options);
		const list = () => git(remote, 'ls-tree', '-r', '--name-only', 'gh-pages').split('\n');
		expect(list()).toEqual(['.nojekyll', '.test-hidden', 'assets/test.js', 'index.html']);
		expect(git(remote, 'show', 'gh-pages:index.html')).toBe(
			readFileSync(join(build, 'index.html'), 'utf8').trim()
		);
		rmSync(join(build, 'assets'), { recursive: true });
		writeFileSync(join(build, 'index.html'), '<title>test-update</title>');
		await ghPages.publish(build, options);
		expect(list()).not.toContain('assets/test.js');
		expect(git(remote, 'show', 'gh-pages:index.html')).toBe('<title>test-update</title>');
	} finally {
		vi.unstubAllEnvs();
		rmSync(temp, { recursive: true, force: true });
	}
}, 15000);
