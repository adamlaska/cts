import { kLimitBaseParams, makeLimitTestGroup } from './limit_utils.js';

function getPipelineDescriptor(device: GPUDevice, lastIndex: number): GPURenderPipelineDescriptor {
  const code = `
  @vertex fn vs(@location(${lastIndex}) v: vec4f) -> @builtin(position) vec4f {
    return v;
  }
  `;
  const module = device.createShaderModule({ code });
  return {
    layout: 'auto',
    vertex: {
      module,
      entryPoint: 'vs',
      buffers: [
        {
          arrayStride: 32,
          attributes: [{ shaderLocation: lastIndex, offset: 0, format: 'float32x4' }],
        },
      ],
    },
  };
}

const limit = 'maxVertexAttributes';
export const { g, description } = makeLimitTestGroup(limit);

g.test('createRenderPipeline,at_over')
  .desc(`Test using createRenderPipeline at and over ${limit} limit`)
  .params(kLimitBaseParams)
  .fn(async t => {
    const { limitTest, testValueName } = t.params;
    await t.testDeviceWithRequestedLimits(
      limitTest,
      testValueName,
      async ({ device, testValue, shouldError }) => {
        const lastIndex = testValue - 1;
        const pipelineDescriptor = getPipelineDescriptor(device, lastIndex);

        await t.expectValidationError(() => {
          device.createRenderPipeline(pipelineDescriptor);
        }, shouldError);
      }
    );
  });

g.test('createRenderPipelineAsync,at_over')
  .desc(`Test using createRenderPipelineAsync at and over ${limit} limit`)
  .params(kLimitBaseParams)
  .fn(async t => {
    const { limitTest, testValueName } = t.params;
    await t.testDeviceWithRequestedLimits(
      limitTest,
      testValueName,
      async ({ device, testValue, shouldError }) => {
        const lastIndex = testValue - 1;
        const pipelineDescriptor = getPipelineDescriptor(device, lastIndex);

        await t.shouldRejectConditionally(
          'OperationError',
          device.createRenderPipelineAsync(pipelineDescriptor),
          shouldError
        );
      }
    );
  });
