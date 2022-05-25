/**
* AUTO-GENERATED - DO NOT EDIT. Source: https://github.com/gpuweb/cts
**/export const description = `
Here we test the validation for draw functions, mainly the buffer access validation. All four types
of draw calls are tested, and test that validation errors do / don't occur for certain call type
and parameters as expect.
`;import { makeTestGroup } from '../../../../../../common/framework/test_group.js';
import { kVertexFormatInfo } from '../../../../../capability_info.js';

import { ValidationTest } from '../../../validation_test.js';





















function callDrawIndexed(
test,
encoder,
drawType,
param)
{
  switch (drawType) {
    case 'drawIndexed':{
        encoder.drawIndexed(
        param.indexCount,
        param.instanceCount ?? 1,
        param.firstIndex ?? 0,
        param.baseVertex ?? 0,
        param.firstInstance ?? 0);

        break;
      }
    case 'drawIndexedIndirect':{
        const indirectArray = new Int32Array([
        param.indexCount,
        param.instanceCount ?? 1,
        param.firstIndex ?? 0,
        param.baseVertex ?? 0,
        param.firstInstance ?? 0]);

        const indirectBuffer = test.makeBufferWithContents(indirectArray, GPUBufferUsage.INDIRECT);
        encoder.drawIndexedIndirect(indirectBuffer, 0);
        break;
      }}

}







function callDraw(
test,
encoder,
drawType,
param)
{
  switch (drawType) {
    case 'draw':{
        encoder.draw(
        param.vertexCount,
        param.instanceCount ?? 1,
        param.firstVertex ?? 0,
        param.firstInstance ?? 0);

        break;
      }
    case 'drawIndirect':{
        const indirectArray = new Int32Array([
        param.vertexCount,
        param.instanceCount ?? 1,
        param.firstVertex ?? 0,
        param.firstInstance ?? 0]);

        const indirectBuffer = test.makeBufferWithContents(indirectArray, GPUBufferUsage.INDIRECT);
        encoder.drawIndirect(indirectBuffer, 0);
        break;
      }}

}

function makeTestPipeline(
test,
buffers)






{
  const bufferLayouts = [];
  for (const b of buffers) {
    bufferLayouts[b.slot] = b;
  }

  return test.device.createRenderPipeline({
    vertex: {
      module: test.device.createShaderModule({
        code: test.getNoOpShaderCode('VERTEX') }),

      entryPoint: 'main',
      buffers: bufferLayouts },

    fragment: {
      module: test.device.createShaderModule({
        code: test.getNoOpShaderCode('FRAGMENT') }),

      entryPoint: 'main',
      targets: [{ format: 'rgba8unorm', writeMask: 0 }] },

    primitive: { topology: 'triangle-list' } });

}

export const g = makeTestGroup(ValidationTest);

g.test(`unused_buffer_bound`).
desc(
`
In this test we test that a small buffer bound to unused buffer slot won't cause validation error.
- All draw commands,
  - An unused {index , vertex} buffer with uselessly small range is bound (immediately before draw
    call)
`).

unimplemented();

g.test(`index_buffer_OOB`).
desc(
`
In this test we test that index buffer OOB is caught as a validation error in drawIndexed, but not in
drawIndexedIndirect as it is GPU-validated.
- Issue an indexed draw call, with the following index buffer states, for {all index formats}:
    - range and GPUBuffer are exactly the required size for the draw call
    - range is too small but GPUBuffer is still large enough
    - range and GPUBuffer are both too small
`).

params((u) =>
u.
combine('bufferSizeInElements', [10, 100])
// Binding size is always no larger than buffer size, make sure that setIndexBuffer succeed
.combine('bindingSizeInElements', [10]).
combine('drawIndexCount', [10, 11]).
combine('drawType', ['drawIndexed', 'drawIndexedIndirect']).
beginSubcases().
combine('indexFormat', ['uint16', 'uint32']).
combine('useBundle', [false, true])).

fn(async (t) => {
  const {
    indexFormat,
    bindingSizeInElements,
    bufferSizeInElements,
    drawIndexCount,
    drawType,
    useBundle } =
  t.params;

  const indexElementSize = indexFormat === 'uint16' ? 2 : 4;
  const bindingSize = bindingSizeInElements * indexElementSize;
  const bufferSize = bufferSizeInElements * indexElementSize;

  const desc = {
    size: bufferSize,
    usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST };

  const indexBuffer = t.createBufferWithState('valid', desc);

  const drawCallParam = {
    indexCount: drawIndexCount };


  // Encoder finish will succeed if no index buffer access OOB when calling drawIndexed,
  // and always succeed when calling drawIndexedIndirect.
  const isFinishSuccess =
  drawIndexCount <= bindingSizeInElements || drawType === 'drawIndexedIndirect';

  const renderPipeline = t.createNoOpRenderPipeline();

  const commandBufferMaker = t.createEncoder(useBundle ? 'render bundle' : 'render pass');
  const renderEncoder = commandBufferMaker.encoder;

  renderEncoder.setIndexBuffer(indexBuffer, indexFormat, 0, bindingSize);

  renderEncoder.setPipeline(renderPipeline);

  callDrawIndexed(t, renderEncoder, drawType, drawCallParam);

  commandBufferMaker.validateFinishAndSubmit(isFinishSuccess, true);
});

g.test(`vertex_buffer_OOB`).
desc(
`
In this test we test the vertex buffer OOB validation in draw calls. Specifically, only vertex step
mode buffer OOB in draw and instance step mode buffer OOB in draw and drawIndexed are CPU-validated.
Other cases are handled by robust access and no validation error occurs.
- Test that:
    - Draw call needs to read {=, >} any bound vertex buffer range, with GPUBuffer that is {large
      enough, exactly the size of bound range}
        - Binding size = 0 (ensure it's not treated as a special case)
        - x= weird buffer offset values
        - x= weird attribute offset values
        - x= weird arrayStride values
        - x= {render pass, render bundle}
- For vertex step mode vertex buffer,
    - Test that:
        - vertexCount largeish
        - firstVertex {=, >} 0
        - arrayStride is 0 and bound buffer size too small
        - (vertexCount + firstVertex) is zero
    - Validation error occurs in:
        - draw
        - drawIndexed with a zero array stride vertex step mode buffer OOB
    - Otherwise no validation error in drawIndexed, draIndirect and drawIndexedIndirect
- For instance step mode vertex buffer,
    - Test with draw and drawIndexed:
        - instanceCount largeish
        - firstInstance {=, >} 0
        - arrayStride is 0 and bound buffer size too small
        - (instanceCount + firstInstance) is zero
    - Validation error occurs in draw and drawIndexed
    - No validation error in drawIndirect and drawIndexedIndirect

In this test, we use a a render pipeline requiring one vertex step mode with different vertex buffer
layouts (attribute offset, array stride, vertex format). Then for a given drawing parameter set (e.g.,
vertexCount, instanceCount, firstVertex, indexCount), we calculate the exactly required size for
vertex step mode vertex buffer. Then, we generate buffer parameters (i.e. GPU buffer size,
binding offset and binding size) for all buffers, covering both (bound size == required size),
(bound size == required size - 1), and (bound size == 0), and test that draw and drawIndexed will
success/error as expected. Such set of buffer parameters should include cases like weird offset values.
`).

params((u) =>
u.
combine('drawType', ['draw', 'drawIndexed', 'drawIndirect', 'drawIndexedIndirect']).
combine('boundVertexBufferSizeState', ['zero', 'exile', 'enough']).
combine('boundInstanceBufferSizeState', ['zero', 'exile', 'enough']).
combine('zeroVertexStrideCount', [false, true]).
combine('zeroInstanceStrideCount', [false, true]).
combine('arrayStrideState', ['zero', 'exact', 'oversize']).
combine('attributeOffsetFactor', [0, 1, 2, 7]) // the offset of attribute will be factor * MIN(4, sizeof(vertexFormat))
.beginSubcases().
combine('setBufferOffset', [0, 200]) // must be a multiple of 4
.combine('attributeFormat', ['snorm8x2', 'float32', 'float16x4']).
combine('vertexCount', [0, 1, 10000]).
combine('firstVertex', [0, 10000]).
filter((p) => p.zeroVertexStrideCount === (p.firstVertex + p.vertexCount === 0)).
combine('instanceCount', [0, 1, 10000]).
combine('firstInstance', [0, 10000]).
filter((p) => p.zeroInstanceStrideCount === (p.firstInstance + p.instanceCount === 0)).
unless((p) => p.vertexCount === 10000 && p.instanceCount === 10000)).

fn(async (t) => {
  const {
    drawType,
    boundVertexBufferSizeState,
    boundInstanceBufferSizeState,
    zeroVertexStrideCount,
    zeroInstanceStrideCount,
    arrayStrideState,
    attributeOffsetFactor,
    setBufferOffset,
    attributeFormat,
    vertexCount,
    instanceCount,
    firstVertex,
    firstInstance } =
  t.params;

  const attributeFormatInfo = kVertexFormatInfo[attributeFormat];
  const formatSize = attributeFormatInfo.bytesPerComponent * attributeFormatInfo.componentCount;
  const attributeOffset = attributeOffsetFactor * Math.min(4, formatSize);
  const lastStride = attributeOffset + formatSize;
  let arrayStride = 0;
  if (arrayStrideState !== 'zero') {
    arrayStride = lastStride;
    if (arrayStrideState === 'oversize') {
      arrayStride = arrayStride + 20;
    }
    arrayStride = arrayStride + (-arrayStride & 3); // Make sure arrayStride is a multiple of 4
  }

  const calcSetBufferSize = (
  boundBufferSizeState,
  strideCount) =>
  {
    let requiredBufferSize;
    if (strideCount > 0) {
      requiredBufferSize = arrayStride * (strideCount - 1) + lastStride;
    } else {
      // Spec do not validate bounded buffer size if strideCount == 0.
      requiredBufferSize = lastStride;
    }
    let setBufferSize;
    switch (boundBufferSizeState) {
      case 'zero':{
          setBufferSize = 0;
          break;
        }
      case 'exile':{
          setBufferSize = requiredBufferSize - 1;
          break;
        }
      case 'enough':{
          setBufferSize = requiredBufferSize;
          break;
        }}

    return setBufferSize;
  };

  const strideCountForVertexBuffer = firstVertex + vertexCount;
  const setVertexBufferSize = calcSetBufferSize(
  boundVertexBufferSizeState,
  strideCountForVertexBuffer);

  const vertexBufferSize = setBufferOffset + setVertexBufferSize;
  const strideCountForInstanceBuffer = firstInstance + instanceCount;
  const setInstanceBufferSize = calcSetBufferSize(
  boundInstanceBufferSizeState,
  strideCountForInstanceBuffer);

  const instanceBufferSize = setBufferOffset + setInstanceBufferSize;

  const vertexBuffer = t.createBufferWithState('valid', {
    size: vertexBufferSize,
    usage: GPUBufferUsage.VERTEX });

  const instanceBuffer = t.createBufferWithState('valid', {
    size: instanceBufferSize,
    usage: GPUBufferUsage.VERTEX });


  const vertexBufferLayouts = [
  {
    slot: 1,
    stepMode: 'vertex',
    arrayStride,
    attributes: [
    {
      shaderLocation: 2,
      format: attributeFormat,
      offset: attributeOffset }] },



  {
    slot: 7,
    stepMode: 'instance',
    arrayStride,
    attributes: [
    {
      shaderLocation: 6,
      format: attributeFormat,
      offset: attributeOffset }] }];





  const renderPipeline = makeTestPipeline(t, vertexBufferLayouts);

  for (const useBundle of [false, true]) {
    for (const setBufferBeforePipeline of [false, true]) {
      const commandBufferMaker = t.createEncoder(useBundle ? 'render bundle' : 'render pass');
      const renderEncoder = commandBufferMaker.encoder;

      if (setBufferBeforePipeline) {
        renderEncoder.setVertexBuffer(1, vertexBuffer, setBufferOffset, setVertexBufferSize);
        renderEncoder.setVertexBuffer(7, instanceBuffer, setBufferOffset, setInstanceBufferSize);
      }
      renderEncoder.setPipeline(renderPipeline);
      if (!setBufferBeforePipeline) {
        renderEncoder.setVertexBuffer(1, vertexBuffer, setBufferOffset, setVertexBufferSize);
        renderEncoder.setVertexBuffer(7, instanceBuffer, setBufferOffset, setInstanceBufferSize);
      }

      if (drawType === 'draw' || drawType === 'drawIndirect') {
        const drawParam = {
          vertexCount,
          instanceCount,
          firstVertex,
          firstInstance };


        callDraw(t, renderEncoder, drawType, drawParam);
      } else {
        const indexFormat = 'uint16';
        const indexElementSize = 2;
        const indexCount = 12;
        const indexBufferSize = indexElementSize * indexCount;

        const desc = {
          size: indexBufferSize,
          usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST };

        const indexBuffer = t.createBufferWithState('valid', desc);

        const drawParam = {
          indexCount,
          instanceCount,
          firstIndex: 0,
          baseVertex: firstVertex,
          firstInstance };


        renderEncoder.setIndexBuffer(indexBuffer, indexFormat, 0, indexBufferSize);
        callDrawIndexed(t, renderEncoder, drawType, drawParam);
      }

      const isVertexBufferOOB =
      boundVertexBufferSizeState !== 'enough' &&
      drawType === 'draw' && // drawIndirect, drawIndexed, and drawIndexedIndirect do not validate vertex step mode buffer
      !zeroVertexStrideCount; // vertex step mode buffer never OOB if stride count = 0
      const isInstanceBufferOOB =
      boundInstanceBufferSizeState !== 'enough' && (
      drawType === 'draw' || drawType === 'drawIndexed') && // drawIndirect and drawIndexedIndirect do not validate instance step mode buffer
      !zeroInstanceStrideCount; // vertex step mode buffer never OOB if stride count = 0
      const isFinishSuccess = !isVertexBufferOOB && !isInstanceBufferOOB;

      commandBufferMaker.validateFinishAndSubmit(isFinishSuccess, true);
    }
  }
});

g.test(`last_buffer_setting_take_account`).
desc(
`
In this test we test that only the last setting for a buffer slot take account.
- All (non/indexed, in/direct) draw commands
  - setPl, setVB, setIB, draw, {setPl,setVB,setIB,nothing (control)}, then a larger draw that
    wouldn't have been valid before that
`).

unimplemented();

g.test(`buffer_binding_overlap`).
desc(
`
In this test we test that binding one GPU buffer to multiple vertex buffer slot or both vertex
buffer slot and index buffer will cause no validation error, with completely/partial overlap.
    - x= all draw types
`).

unimplemented();
//# sourceMappingURL=draw.spec.js.map