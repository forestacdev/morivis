const GITHUB_API_BASE_URL = 'https://api.github.com';

export const MORIVIS_GITHUB_OWNER = 'forestacdev';
export const MORIVIS_GITHUB_REPOSITORY = 'morivis';

export interface GitHubRepositorySummary {
	id: number;
	name: string;
	full_name: string;
	description: string | null;
	html_url: string;
	stargazers_count: number;
	watchers_count: number;
	forks_count: number;
	open_issues_count: number;
	language: string | null;
	topics: string[];
	default_branch: string;
	homepage: string | null;
	archived: boolean;
	disabled: boolean;
	updated_at: string;
	pushed_at: string;
}

export interface GitHubContributor {
	login: string;
	id: number;
	avatar_url: string;
	html_url: string;
	contributions: number;
	type: string;
}

export interface GitHubRelease {
	id: number;
	tag_name: string;
	name: string | null;
	body: string;
	html_url: string;
	draft: boolean;
	prerelease: boolean;
	published_at: string | null;
	created_at: string;
}

interface GitHubRepositoryRef {
	owner: string;
	repo: string;
}

const buildRepositoryPath = ({ owner, repo }: GitHubRepositoryRef, path = '') => {
	return `${GITHUB_API_BASE_URL}/repos/${owner}/${repo}${path}`;
};

const fetchGitHubApi = async <T>(url: string): Promise<T> => {
	const response = await fetch(url, {
		headers: {
			Accept: 'application/vnd.github+json'
		}
	});

	if (!response.ok) {
		throw new Error(`GitHub API request failed: ${response.status} ${response.statusText}`);
	}

	return (await response.json()) as T;
};

export const getGitHubRepository = async ({
	owner,
	repo
}: GitHubRepositoryRef): Promise<GitHubRepositorySummary> => {
	return await fetchGitHubApi<GitHubRepositorySummary>(buildRepositoryPath({ owner, repo }));
};

export const getGitHubContributors = async (
	{ owner, repo }: GitHubRepositoryRef,
	options: {
		anon?: boolean;
		perPage?: number;
		page?: number;
	} = {}
): Promise<GitHubContributor[]> => {
	const params = new URLSearchParams();

	if (options.anon) {
		params.set('anon', '1');
	}

	if (options.perPage) {
		params.set('per_page', `${options.perPage}`);
	}

	if (options.page) {
		params.set('page', `${options.page}`);
	}

	const query = params.toString();
	const url = buildRepositoryPath(
		{ owner, repo },
		`/contributors${query ? `?${query}` : ''}`
	);

	return await fetchGitHubApi<GitHubContributor[]>(url);
};

export const getGitHubLatestRelease = async ({
	owner,
	repo
}: GitHubRepositoryRef): Promise<GitHubRelease> => {
	return await fetchGitHubApi<GitHubRelease>(buildRepositoryPath({ owner, repo }, '/releases/latest'));
};

export const getMorivisRepository = async () => {
	return await getGitHubRepository({
		owner: MORIVIS_GITHUB_OWNER,
		repo: MORIVIS_GITHUB_REPOSITORY
	});
};

export const getMorivisContributors = async (
	options: {
		anon?: boolean;
		perPage?: number;
		page?: number;
	} = {}
) => {
	return await getGitHubContributors(
		{
			owner: MORIVIS_GITHUB_OWNER,
			repo: MORIVIS_GITHUB_REPOSITORY
		},
		options
	);
};

export const getMorivisLatestRelease = async () => {
	return await getGitHubLatestRelease({
		owner: MORIVIS_GITHUB_OWNER,
		repo: MORIVIS_GITHUB_REPOSITORY
	});
};
