export const description = `
Converts two floating point values to half-precision floating point numbers, and then combines them into one u32 value.
Component e[i] of the input is converted to a IEEE-754 binary16 value,
which is then placed in bits 16 × i through 16 × i + 15 of the result.
`;

import { makeTestGroup } from '../../../../../../common/framework/test_group.js';
import { assert } from '../../../../../../common/util/util.js';
import { GPUTest } from '../../../../../gpu_test.js';
import { anyOf, Comparator } from '../../../../../util/compare.js';
import {
  f32,
  pack2x16float,
  Scalar,
  TypeF32,
  TypeU32,
  TypeVec,
  u32,
  vec2,
} from '../../../../../util/conversion.js';
import { quantizeToF32, vectorTestValues } from '../../../../../util/math.js';
import { allInputSources, Case, run } from '../../expression.js';

import { builtin } from './builtin.js';

export const g = makeTestGroup(GPUTest);

/**
 * @returns a custom comparator for a possible result from pack2x16float
 * @param expectation element of the array generated by pack2x16float
 */
export function cmp(expectation: number | undefined): Comparator {
  return got => {
    assert(got instanceof Scalar, `Received non-Scalar Value in pack2x16float comparator`);
    let matched = true;
    if (expectation !== undefined) {
      matched = (got.value as number) === expectation;
    }

    return {
      matched,
      got: `${got}`,
      expected: `${expectation !== undefined ? u32(expectation) : 'Any'}`,
    };
  };
}

g.test('pack')
  .specURL('https://www.w3.org/TR/WGSL/#pack-builtin-functions')
  .desc(
    `
@const fn pack2x16float(e: vec2<f32>) -> u32
`
  )
  .params(u => u.combine('inputSource', allInputSources))
  .fn(async t => {
    const makeCase = (x: number, y: number): Case => {
      x = quantizeToF32(x);
      y = quantizeToF32(y);
      const results = pack2x16float(x, y);
      return { input: [vec2(f32(x), f32(y))], expected: anyOf(...results.map(cmp)) };
    };

    const cases: Array<Case> = vectorTestValues(2, t.params.inputSource === 'const').map(v => {
      return makeCase(...(v as [number, number]));
    });

    await run(t, builtin('pack2x16float'), [TypeVec(2, TypeF32)], TypeU32, t.params, cases);
  });
