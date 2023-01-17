/**
* AUTO-GENERATED - DO NOT EDIT. Source: https://github.com/gpuweb/cts
**/export const description = `
Execution Tests for the u32 arithmetic binary expression operations
`;import { makeTestGroup } from '../../../../../common/framework/test_group.js';
import { GPUTest } from '../../../../gpu_test.js';
import { TypeU32 } from '../../../../util/conversion.js';
import { fullU32Range } from '../../../../util/math.js';
import { makeCaseCache } from '../case_cache.js';
import { allInputSources, generateBinaryToU32Cases, run } from '../expression.js';

import { binary } from './binary.js';

export const g = makeTestGroup(GPUTest);

export const d = makeCaseCache('binary/i32_arithmetic', {
  addition: () => {
    return generateBinaryToU32Cases(fullU32Range(), fullU32Range(), (x, y) => {
      return x + y;
    });
  },
  subtraction: () => {
    return generateBinaryToU32Cases(fullU32Range(), fullU32Range(), (x, y) => {
      return x - y;
    });
  },
  multiplication: () => {
    return generateBinaryToU32Cases(fullU32Range(), fullU32Range(), (x, y) => {
      return Math.imul(x, y);
    });
  },
  division_non_const: () => {
    return generateBinaryToU32Cases(fullU32Range(), fullU32Range(), (x, y) => {
      if (y === 0) {
        return 0;
      }
      return x / y;
    });
  },
  division_const: () => {
    return generateBinaryToU32Cases(fullU32Range(), fullU32Range(), (x, y) => {
      if (y === 0) {
        return undefined;
      }
      return x / y;
    });
  },
  remainder_non_const: () => {
    return generateBinaryToU32Cases(fullU32Range(), fullU32Range(), (x, y) => {
      if (y === 0) {
        return 0;
      }
      return x % y;
    });
  },
  remainder_const: () => {
    return generateBinaryToU32Cases(fullU32Range(), fullU32Range(), (x, y) => {
      if (y === 0) {
        return undefined;
      }
      return x % y;
    });
  }
});

g.test('addition').
specURL('https://www.w3.org/TR/WGSL/#floating-point-evaluation').
desc(
`
Expression: x + y
`).

params((u) =>
u.combine('inputSource', allInputSources).combine('vectorize', [undefined, 2, 3, 4])).

fn(async (t) => {
  const cases = await d.get('addition');
  await run(t, binary('+'), [TypeU32, TypeU32], TypeU32, t.params, cases);
});

g.test('subtraction').
specURL('https://www.w3.org/TR/WGSL/#floating-point-evaluation').
desc(
`
Expression: x - y
`).

params((u) =>
u.combine('inputSource', allInputSources).combine('vectorize', [undefined, 2, 3, 4])).

fn(async (t) => {
  const cases = await d.get('subtraction');
  await run(t, binary('-'), [TypeU32, TypeU32], TypeU32, t.params, cases);
});

g.test('multiplication').
specURL('https://www.w3.org/TR/WGSL/#floating-point-evaluation').
desc(
`
Expression: x * y
`).

params((u) =>
u.combine('inputSource', allInputSources).combine('vectorize', [undefined, 2, 3, 4])).

fn(async (t) => {
  const cases = await d.get('multiplication');
  await run(t, binary('*'), [TypeU32, TypeU32], TypeU32, t.params, cases);
});

g.test('division').
specURL('https://www.w3.org/TR/WGSL/#floating-point-evaluation').
desc(
`
Expression: x / y
`).

params((u) =>
u.combine('inputSource', allInputSources).combine('vectorize', [undefined, 2, 3, 4])).

fn(async (t) => {
  const cases = await d.get(
  t.params.inputSource === 'const' ? 'division_const' : 'division_non_const');

  await run(t, binary('/'), [TypeU32, TypeU32], TypeU32, t.params, cases);
});

g.test('remainder').
specURL('https://www.w3.org/TR/WGSL/#floating-point-evaluation').
desc(
`
Expression: x % y
`).

params((u) =>
u.combine('inputSource', allInputSources).combine('vectorize', [undefined, 2, 3, 4])).

fn(async (t) => {
  const cases = await d.get(
  t.params.inputSource === 'const' ? 'remainder_const' : 'remainder_non_const');

  await run(t, binary('%'), [TypeU32, TypeU32], TypeU32, t.params, cases);
});
//# sourceMappingURL=u32_arithmetic.spec.js.map