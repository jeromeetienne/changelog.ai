///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	Semver Utils — numeric comparison for strict MAJOR.MINOR.PATCH versions
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

/** Numeric comparison for strict `MAJOR.MINOR.PATCH` version strings (see `SEMVER_PATTERN`). */
export class SemverUtils {
	/**
	 * Compares two `MAJOR.MINOR.PATCH` version strings numerically (not lexically,
	 * so `'10.0.0'` correctly compares greater than `'9.0.0'`).
	 *
	 * @param a The first version.
	 * @param b The second version.
	 * @returns A negative number if `a` < `b`, a positive number if `a` > `b`, 0 if equal.
	 */
	static compare(a: string, b: string): number {
		const partsA = a.split('.').map(Number);
		const partsB = b.split('.').map(Number);
		for (let i = 0; i < 3; i++) {
			if (partsA[i] !== partsB[i]) {
				return partsA[i] - partsB[i];
			}
		}
		return 0;
	}
}
