// node imports
import Fs from 'node:fs';
import Path from 'node:path';

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	Utils IO
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

/** Sentinel path meaning stdin (for reads) or stdout (for writes). */
const STDIO_PATH = '-';

/** File descriptor for stdin. */
const STDIN_FD = 0;

/**
 * File I/O helpers for the CLI, honoring `-` as stdin/stdout so commands can be
 * chained in a shell pipeline.
 */
export class UtilsIo {
	/**
	 * Reads UTF-8 text from a file, or from stdin when `path` is `-`.
	 *
	 * @param path The file path, or `-` for stdin.
	 * @returns The file contents.
	 */
	static readInput(path: string): string {
		if (path === STDIO_PATH) {
			return UtilsIo._readStdin();
		}
		return Fs.readFileSync(Path.resolve(path), 'utf8');
	}

	/**
	 * Writes UTF-8 text to a file, or to stdout when `path` is `-` (appending a
	 * trailing newline for terminal readability).
	 *
	 * @param path The file path, or `-` for stdout.
	 * @param data The text to write.
	 */
	static writeOutput(path: string, data: string): void {
		if (path === STDIO_PATH) {
			process.stdout.write(data.endsWith('\n') === true ? data : `${data}\n`);
			return;
		}
		Fs.writeFileSync(Path.resolve(path), data);
	}

	/**
	 * Reports whether a file exists at `path`.
	 *
	 * @param path The file path to check.
	 * @returns True if a file exists at `path`.
	 */
	static exists(path: string): boolean {
		return Fs.existsSync(Path.resolve(path));
	}

	/**
	 * Reads all of stdin synchronously. `readFileSync(0)` can throw `EAGAIN` when
	 * stdin is a non-blocking pipe (common when the parent process left it that
	 * way), so this loops with `readSync` and retries on `EAGAIN` rather than
	 * crashing the command.
	 *
	 * @returns The full stdin contents as UTF-8 text.
	 */
	private static _readStdin(): string {
		const chunks: Buffer[] = [];
		const buffer = Buffer.alloc(64 * 1024);
		for (;;) {
			let bytesRead: number;
			try {
				bytesRead = Fs.readSync(STDIN_FD, buffer, 0, buffer.length, null);
			} catch (error: unknown) {
				const code = (error as NodeJS.ErrnoException).code;
				if (code === 'EAGAIN') {
					continue;
				}
				if (code === 'EOF') {
					break;
				}
				throw error;
			}
			if (bytesRead === 0) {
				break;
			}
			chunks.push(Buffer.from(buffer.subarray(0, bytesRead)));
		}
		return Buffer.concat(chunks).toString('utf8');
	}
}
