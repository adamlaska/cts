export const description = `
Validation tests to all commands of GPUCommandEncoder, GPUComputePassEncoder, and
GPURenderPassEncoder when the encoder is not finished.
`;

import { makeTestGroup } from '../../../../common/framework/test_group.js';
import { keysOf } from '../../../../common/util/data_tables.js';
import { unreachable } from '../../../../common/util/util.js';
import { AllFeaturesMaxLimitsGPUTest } from '../../../gpu_test.js';
import * as vtu from '../validation_test_utils.js';

import { beginRenderPassWithQuerySet } from './queries/common.js';

class F extends AllFeaturesMaxLimitsGPUTest {
  createRenderPipelineForTest(): GPURenderPipeline {
    return this.device.createRenderPipeline({
      layout: 'auto',
      vertex: {
        module: this.device.createShaderModule({
          code: `
            @vertex fn main() -> @builtin(position) vec4<f32> {
              return vec4<f32>();
            }
          `,
        }),
        entryPoint: 'main',
      },
      fragment: {
        module: this.device.createShaderModule({
          code: `@fragment fn main() {}`,
        }),
        entryPoint: 'main',
        targets: [{ format: 'rgba8unorm', writeMask: 0 }],
      },
    });
  }

  createBindGroupForTest(): GPUBindGroup {
    return this.device.createBindGroup({
      entries: [
        {
          binding: 0,
          resource: this.device.createSampler(),
        },
      ],
      layout: this.device.createBindGroupLayout({
        entries: [
          {
            binding: 0,
            visibility: GPUShaderStage.FRAGMENT,
            sampler: { type: 'filtering' },
          },
        ],
      }),
    });
  }
}

export const g = makeTestGroup(F);

type EncoderCommands = keyof Omit<GPUCommandEncoder, '__brand' | 'label' | 'finish'>;
const kEncoderCommandInfo: {
  readonly [k in EncoderCommands]: {};
} = {
  beginComputePass: {},
  beginRenderPass: {},
  clearBuffer: {},
  copyBufferToBuffer: {},
  copyBufferToTexture: {},
  copyTextureToBuffer: {},
  copyTextureToTexture: {},
  insertDebugMarker: {},
  popDebugGroup: {},
  pushDebugGroup: {},
  resolveQuerySet: {},
};
const kEncoderCommands = keysOf(kEncoderCommandInfo);

// MAINTENANCE_TODO: Remove multiDrawIndirect and multiDrawIndexedIndirect once https://github.com/gpuweb/gpuweb/pull/2315 is merged.
type RenderPassEncoderCommands =
  | keyof Omit<GPURenderPassEncoder, '__brand' | 'label' | 'end'>
  | 'multiDrawIndirect'
  | 'multiDrawIndexedIndirect';
const kRenderPassEncoderCommandInfo: {
  readonly [k in RenderPassEncoderCommands]: {};
} = {
  draw: {},
  drawIndexed: {},
  drawIndexedIndirect: {},
  drawIndirect: {},
  multiDrawIndexedIndirect: {},
  multiDrawIndirect: {},
  setIndexBuffer: {},
  setBindGroup: {},
  setVertexBuffer: {},
  setPipeline: {},
  setViewport: {},
  setScissorRect: {},
  setBlendConstant: {},
  setStencilReference: {},
  beginOcclusionQuery: {},
  endOcclusionQuery: {},
  executeBundles: {},
  pushDebugGroup: {},
  popDebugGroup: {},
  insertDebugMarker: {},
};
const kRenderPassEncoderCommands = keysOf(kRenderPassEncoderCommandInfo);

type RenderBundleEncoderCommands = keyof Omit<
  GPURenderBundleEncoder,
  '__brand' | 'label' | 'finish'
>;
const kRenderBundleEncoderCommandInfo: {
  readonly [k in RenderBundleEncoderCommands]: {};
} = {
  draw: {},
  drawIndexed: {},
  drawIndexedIndirect: {},
  drawIndirect: {},
  setPipeline: {},
  setBindGroup: {},
  setIndexBuffer: {},
  setVertexBuffer: {},
  pushDebugGroup: {},
  popDebugGroup: {},
  insertDebugMarker: {},
};
const kRenderBundleEncoderCommands = keysOf(kRenderBundleEncoderCommandInfo);

// MAINTENANCE_TODO: remove the deprecated 'dispatch' and 'dispatchIndirect' here once they're
// removed from `@webgpu/types`.
type ComputePassEncoderCommands = keyof Omit<
  GPUComputePassEncoder,
  '__brand' | 'label' | 'end' | 'dispatch' | 'dispatchIndirect'
>;
const kComputePassEncoderCommandInfo: {
  readonly [k in ComputePassEncoderCommands]: {};
} = {
  setBindGroup: {},
  setPipeline: {},
  dispatchWorkgroups: {},
  dispatchWorkgroupsIndirect: {},
  pushDebugGroup: {},
  popDebugGroup: {},
  insertDebugMarker: {},
};
const kComputePassEncoderCommands = keysOf(kComputePassEncoderCommandInfo);

g.test('non_pass_commands')
  .desc(
    `
  Test that functions of GPUCommandEncoder generate a validation error if the encoder is already
  finished.
  `
  )
  .params(u =>
    u
      .combine('command', kEncoderCommands)
      .beginSubcases()
      .combine('finishBeforeCommand', [false, true])
  )
  .fn(t => {
    const { command, finishBeforeCommand } = t.params;

    const srcBuffer = t.createBufferTracked({
      size: 16,
      usage: GPUBufferUsage.COPY_SRC | GPUTextureUsage.COPY_DST,
    });
    const dstBuffer = t.createBufferTracked({
      size: 16,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.QUERY_RESOLVE,
    });

    const textureSize = { width: 1, height: 1 };
    const textureFormat = 'rgba8unorm';
    const srcTexture = t.createTextureTracked({
      size: textureSize,
      format: textureFormat,
      usage: GPUTextureUsage.COPY_SRC,
    });
    const dstTexture = t.createTextureTracked({
      size: textureSize,
      format: textureFormat,
      usage: GPUTextureUsage.COPY_DST,
    });

    const querySet = t.createQuerySetTracked({
      type: 'occlusion',
      count: 1,
    });

    const encoder = t.device.createCommandEncoder();

    if (finishBeforeCommand) encoder.finish();

    t.expectValidationError(() => {
      switch (command) {
        case 'beginComputePass':
          {
            encoder.beginComputePass();
          }
          break;
        case 'beginRenderPass':
          {
            encoder.beginRenderPass({ colorAttachments: [] });
          }
          break;
        case 'clearBuffer':
          {
            encoder.clearBuffer(dstBuffer, 0, 16);
          }
          break;
        case 'copyBufferToBuffer':
          {
            encoder.copyBufferToBuffer(srcBuffer, 0, dstBuffer, 0, 0);
          }
          break;
        case 'copyBufferToTexture':
          {
            encoder.copyBufferToTexture(
              { buffer: srcBuffer },
              { texture: dstTexture },
              textureSize
            );
          }
          break;
        case 'copyTextureToBuffer':
          {
            encoder.copyTextureToBuffer(
              { texture: srcTexture },
              { buffer: dstBuffer },
              textureSize
            );
          }
          break;
        case 'copyTextureToTexture':
          {
            encoder.copyTextureToTexture(
              { texture: srcTexture },
              { texture: dstTexture },
              textureSize
            );
          }
          break;
        case 'insertDebugMarker':
          {
            encoder.insertDebugMarker('marker');
          }
          break;
        case 'pushDebugGroup':
          {
            encoder.pushDebugGroup('group');
          }
          break;
        case 'popDebugGroup':
          {
            encoder.popDebugGroup();
          }
          break;
        case 'resolveQuerySet':
          {
            encoder.resolveQuerySet(querySet, 0, 1, dstBuffer, 0);
          }
          break;
        default:
          unreachable();
      }
    }, finishBeforeCommand);
  });

g.test('render_pass_commands')
  .desc(
    `
    Test that functions of GPURenderPassEncoder generate a validation error if the encoder or the
    pass is already finished.

    TODO(https://github.com/gpuweb/gpuweb/issues/5207): Resolve whether the error condition
    \`finishBeforeCommand !== 'no'\` is correct, or should be changed to
    \`finishBeforeCommand === 'encoder'\`.
  `
  )
  .params(u =>
    u
      .combine('command', kRenderPassEncoderCommands)
      .beginSubcases()
      .combine('finishBeforeCommand', ['no', 'pass', 'encoder'])
  )
  .fn(t => {
    const { command, finishBeforeCommand } = t.params;
    if (command === 'multiDrawIndirect' || command === 'multiDrawIndexedIndirect') {
      t.skipIfDeviceDoesNotHaveFeature(
        'chromium-experimental-multi-draw-indirect' as GPUFeatureName
      );
    }

    const querySet = t.createQuerySetTracked({ type: 'occlusion', count: 1 });
    const encoder = t.device.createCommandEncoder();
    const renderPass = beginRenderPassWithQuerySet(t, encoder, querySet);

    const buffer = t.createBufferTracked({
      size: 12,
      usage: GPUBufferUsage.INDIRECT | GPUBufferUsage.VERTEX,
    });

    const pipeline = t.createRenderPipelineForTest();

    const bindGroup = t.createBindGroupForTest();

    if (finishBeforeCommand !== 'no') {
      renderPass.end();
    }
    if (finishBeforeCommand === 'encoder') {
      encoder.finish();
    }

    t.expectValidationError(() => {
      switch (command) {
        case 'draw':
          {
            renderPass.draw(1);
          }
          break;
        case 'drawIndexed':
          {
            renderPass.drawIndexed(1);
          }
          break;
        case 'drawIndirect':
          {
            renderPass.drawIndirect(buffer, 1);
          }
          break;
        case 'setIndexBuffer':
          {
            renderPass.setIndexBuffer(buffer, 'uint32');
          }
          break;
        case 'drawIndexedIndirect':
          {
            renderPass.drawIndexedIndirect(buffer, 0);
          }
          break;
        case 'multiDrawIndirect':
          {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (renderPass as any).multiDrawIndirect(buffer, 0, 1);
          }
          break;
        case 'multiDrawIndexedIndirect':
          {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (renderPass as any).multiDrawIndexedIndirect(buffer, 0, 1);
          }
          break;
        case 'setBindGroup':
          {
            renderPass.setBindGroup(0, bindGroup);
          }
          break;
        case 'setVertexBuffer':
          {
            renderPass.setVertexBuffer(1, buffer);
          }
          break;
        case 'setPipeline':
          {
            renderPass.setPipeline(pipeline);
          }
          break;
        case 'setViewport':
          {
            const kNumTestPoints = 8;
            const kViewportMinDepth = 0;
            const kViewportMaxDepth = 1;
            renderPass.setViewport(0, 0, kNumTestPoints, 0, kViewportMinDepth, kViewportMaxDepth);
          }
          break;
        case 'setScissorRect':
          {
            renderPass.setScissorRect(0, 0, 0, 0);
          }
          break;
        case 'setBlendConstant':
          {
            renderPass.setBlendConstant({ r: 1.0, g: 1.0, b: 1.0, a: 1.0 });
          }
          break;
        case 'setStencilReference':
          {
            renderPass.setStencilReference(0);
          }
          break;
        case 'beginOcclusionQuery':
          {
            renderPass.beginOcclusionQuery(0);
          }
          break;
        case 'endOcclusionQuery':
          {
            renderPass.endOcclusionQuery();
          }
          break;
        case 'executeBundles':
          {
            renderPass.executeBundles([]);
          }
          break;
        case 'pushDebugGroup':
          {
            renderPass.pushDebugGroup('group');
          }
          break;
        case 'popDebugGroup':
          {
            renderPass.popDebugGroup();
          }
          break;
        case 'insertDebugMarker':
          {
            renderPass.insertDebugMarker('marker');
          }
          break;
        default:
          unreachable();
      }
    }, finishBeforeCommand !== 'no');
  });

g.test('render_bundle_commands')
  .desc(
    `
    Test that functions of GPURenderBundleEncoder generate a validation error if the encoder or the
    pass is already finished.
  `
  )
  .params(u =>
    u
      .combine('command', kRenderBundleEncoderCommands)
      .beginSubcases()
      .combine('finishBeforeCommand', [false, true])
  )
  .fn(t => {
    const { command, finishBeforeCommand } = t.params;

    const buffer = t.createBufferTracked({
      size: 12,
      usage: GPUBufferUsage.INDIRECT | GPUBufferUsage.VERTEX,
    });

    const pipeline = t.createRenderPipelineForTest();

    const bindGroup = t.createBindGroupForTest();

    const bundleEncoder = t.device.createRenderBundleEncoder({
      colorFormats: ['rgba8unorm'],
    });

    if (finishBeforeCommand) {
      bundleEncoder.finish();
    }

    t.expectValidationError(() => {
      switch (command) {
        case 'draw':
          {
            bundleEncoder.draw(1);
          }
          break;
        case 'drawIndexed':
          {
            bundleEncoder.drawIndexed(1);
          }
          break;
        case 'drawIndexedIndirect':
          {
            bundleEncoder.drawIndexedIndirect(buffer, 0);
          }
          break;
        case 'drawIndirect':
          {
            bundleEncoder.drawIndirect(buffer, 1);
          }
          break;
        case 'setPipeline':
          {
            bundleEncoder.setPipeline(pipeline);
          }
          break;
        case 'setBindGroup':
          {
            bundleEncoder.setBindGroup(0, bindGroup);
          }
          break;
        case 'setIndexBuffer':
          {
            bundleEncoder.setIndexBuffer(buffer, 'uint32');
          }
          break;
        case 'setVertexBuffer':
          {
            bundleEncoder.setVertexBuffer(1, buffer);
          }
          break;
        case 'pushDebugGroup':
          {
            bundleEncoder.pushDebugGroup('group');
          }
          break;
        case 'popDebugGroup':
          {
            bundleEncoder.popDebugGroup();
          }
          break;
        case 'insertDebugMarker':
          {
            bundleEncoder.insertDebugMarker('marker');
          }
          break;
        default:
          unreachable();
      }
    }, finishBeforeCommand);
  });

g.test('compute_pass_commands')
  .desc(
    `
    Test that functions of GPUComputePassEncoder generate a validation error if the encoder or the
    pass is already finished.

    TODO(https://github.com/gpuweb/gpuweb/issues/5207): Resolve whether the error condition
    \`finishBeforeCommand !== 'no'\` is correct, or should be changed to
    \`finishBeforeCommand === 'encoder'\`.
  `
  )
  .params(u =>
    u
      .combine('command', kComputePassEncoderCommands)
      .beginSubcases()
      .combine('finishBeforeCommand', ['no', 'pass', 'encoder'])
  )
  .fn(t => {
    const { command, finishBeforeCommand } = t.params;

    const encoder = t.device.createCommandEncoder();
    const computePass = encoder.beginComputePass();

    const indirectBuffer = t.createBufferTracked({
      size: 12,
      usage: GPUBufferUsage.INDIRECT,
    });

    const computePipeline = vtu.createNoOpComputePipeline(t);

    const bindGroup = t.createBindGroupForTest();

    if (finishBeforeCommand !== 'no') {
      computePass.end();
    }
    if (finishBeforeCommand === 'encoder') {
      encoder.finish();
    }

    t.expectValidationError(() => {
      switch (command) {
        case 'setBindGroup':
          {
            computePass.setBindGroup(0, bindGroup);
          }
          break;
        case 'setPipeline':
          {
            computePass.setPipeline(computePipeline);
          }
          break;
        case 'dispatchWorkgroups':
          {
            computePass.dispatchWorkgroups(0);
          }
          break;
        case 'dispatchWorkgroupsIndirect':
          {
            computePass.dispatchWorkgroupsIndirect(indirectBuffer, 0);
          }
          break;
        case 'pushDebugGroup':
          {
            computePass.pushDebugGroup('group');
          }
          break;
        case 'popDebugGroup':
          {
            computePass.popDebugGroup();
          }
          break;
        case 'insertDebugMarker':
          {
            computePass.insertDebugMarker('marker');
          }
          break;
        default:
          unreachable();
      }
    }, finishBeforeCommand !== 'no');
  });
