// node imports
import { describe, it } from 'node:test';
import Assert from 'node:assert/strict';

// local imports
import { SemverUtils } from '../src/misc/semver_utils.js';

describe('SemverUtils.compare', () => {
	it('compares numerically, not lexically', () => {
		Assert.ok(SemverUtils.compare('10.0.0', '9.0.0') > 0);
		Assert.ok(SemverUtils.compare('1.2.0', '1.10.0') < 0);
	});

	it('returns 0 for equal versions', () => {
		Assert.equal(SemverUtils.compare('1.2.3', '1.2.3'), 0);
	});

	it('breaks ties on minor and patch', () => {
		Assert.ok(SemverUtils.compare('1.1.0', '1.0.9') > 0);
		Assert.ok(SemverUtils.compare('1.0.1', '1.0.2') < 0);
	});
});
