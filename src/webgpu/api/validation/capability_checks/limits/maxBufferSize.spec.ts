import { kLimitBaseParams, makeLimitTestGroup } from './limit_utils.js';

const limit = 'maxBufferSize';
export const { g, description } = makeLimitTestGroup(limit);

g.test('createBuffer,at_over')
  .desc(`Test using at and over ${limit} limit`)
  .params(kLimitBaseParams)
  .fn(async t => {
    const { limitTest, testValueName } = t.params;
    await t.testDeviceWithRequestedLimits(
      limitTest,
      testValueName,
      async ({ device, testValue, actualLimit, shouldError }) => {
        await t.testForValidationErrorWithPossibleOutOfMemoryError(
          () => {
            const buffer = device.createBuffer({
              usage: GPUBufferUsage.VERTEX,
              size: testValue,
            });
            buffer.destroy();
          },
          shouldError,
          `size: ${testValue}, limit: ${actualLimit}`
        );
      }
    );
  });
