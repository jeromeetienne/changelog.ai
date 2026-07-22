// node imports
import ChildProcess from 'node:child_process';

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	Git Utils — best-effort detection of a repo's hosted URL
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

/** Best-effort git-remote helpers used to derive CHANGELOG.md comparison links. */
export class GitUtils {
	/**
	 * Detects the current repository's hosted base URL (e.g.
	 * `https://github.com/owner/repo`) from the `origin` remote, normalizing
	 * both SSH and HTTPS remote forms.
	 *
	 * @param cwd The directory to run `git` from (defaults to the current process directory).
	 * @returns The normalized base URL, or `null` if there is no git repo, no `origin` remote, or the remote URL is not recognized.
	 */
	static detectRepoUrl(cwd: string = process.cwd()): string | null {
		let remote: string;
		try {
			remote = ChildProcess.execFileSync('git', ['remote', 'get-url', 'origin'], { cwd, encoding: 'utf8' }).trim();
		} catch {
			return null;
		}
		return GitUtils._normalizeRemoteUrl(remote);
	}

	/**
	 * Normalizes a git remote URL (SSH or HTTPS, with or without a `.git`
	 * suffix) into a plain `https://host/owner/repo` base URL.
	 *
	 * @param remote The raw remote URL as reported by `git remote get-url`.
	 * @returns The normalized base URL, or `null` if the form is not recognized.
	 */
	private static _normalizeRemoteUrl(remote: string): string | null {
		const sshMatch = /^git@([^:]+):(.+?)(?:\.git)?$/.exec(remote);
		if (sshMatch !== null) {
			return `https://${sshMatch[1]}/${sshMatch[2]}`;
		}
		const httpsMatch = /^(https?:\/\/[^/]+\/.+?)(?:\.git)?$/.exec(remote);
		if (httpsMatch !== null) {
			return httpsMatch[1];
		}
		return null;
	}
}
