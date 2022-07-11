/**
 * AUTO-GENERATED - DO NOT EDIT. Source: https://github.com/gpuweb/cts
 **/ import { assert } from '../../../../common/util/util.js';
import { compare, anyOf, intervalComparator } from '../../../util/compare.js';
import {
  ScalarType,
  TypeVec,
  TypeU32,
  Vector,
  VectorType,
  f32,
  f64,
} from '../../../util/conversion.js';

import { flushSubnormalNumber, isSubnormalNumber, quantizeToF32 } from '../../../util/math.js';

// Helper for converting Values to Comparators.
function toComparator(input) {
  if (input.type !== undefined) {
    return (got, cmpFloats) => compare(got, input, cmpFloats);
  }
  return input;
}

/** Case is a single expression test case. */

// Read-write storage buffer

/** All possible input sources */
export const allInputSources = ['const', 'uniform', 'storage_r', 'storage_rw'];

/** Configuration for running a expression test */

// Helper for returning the WGSL storage type for the given Type.
function storageType(ty) {
  if (ty instanceof ScalarType) {
    if (ty.kind === 'bool') {
      return TypeU32;
    }
  }
  if (ty instanceof VectorType) {
    return TypeVec(ty.width, storageType(ty.elementType));
  }
  return ty;
}

// Helper for converting a value of the type 'ty' from the storage type.
function fromStorage(ty, expr) {
  if (ty instanceof ScalarType) {
    if (ty.kind === 'bool') {
      return `${expr} != 0u`;
    }
  }
  if (ty instanceof VectorType) {
    if (ty.elementType.kind === 'bool') {
      return `${expr} != vec${ty.width}<u32>(0u)`;
    }
  }
  return expr;
}

// Helper for converting a value of the type 'ty' to the storage type.
function toStorage(ty, expr) {
  if (ty instanceof ScalarType) {
    if (ty.kind === 'bool') {
      return `select(0u, 1u, ${expr})`;
    }
  }
  if (ty instanceof VectorType) {
    if (ty.elementType.kind === 'bool') {
      return `select(vec${ty.width}<u32>(0u), vec${ty.width}<u32>(1u), ${expr})`;
    }
  }
  return expr;
}

// Currently all values are packed into buffers of 16 byte strides
const kValueStride = 16;

// ExpressionBuilder returns the WGSL used to test an expression.

/**
 * Runs the list of expression tests, possibly splitting the tests into multiple
 * dispatches to keep the input data within the buffer binding limits.
 * run() will pack the scalar test cases into smaller set of vectorized tests
 * if `cfg.vectorize` is defined.
 * @param t the GPUTest
 * @param expressionBuilder the expression builder function
 * @param parameterTypes the list of expression parameter types
 * @param returnType the return type for the expression overload
 * @param cfg test configuration values
 * @param cases list of test cases
 */
export function run(
  t,
  expressionBuilder,
  parameterTypes,
  returnType,
  cfg = { inputSource: 'storage_r' },
  cases
) {
  const cmpFloats = cfg.cmpFloats !== undefined ? cfg.cmpFloats : (got, expect) => got === expect;

  // If the 'vectorize' config option was provided, pack the cases into vectors.
  if (cfg.vectorize !== undefined) {
    const packed = packScalarsToVector(parameterTypes, returnType, cases, cfg.vectorize);
    cases = packed.cases;
    parameterTypes = packed.parameterTypes;
    returnType = packed.returnType;
  }

  // The size of the input buffer may exceed the maximum buffer binding size,
  // so chunk the tests up into batches that fit into the limits.
  const casesPerBatch = (function () {
    switch (cfg.inputSource) {
      case 'const':
        return 256; // Arbitrary limit, to ensure shaders aren't too large
      case 'uniform':
        return Math.floor(
          t.device.limits.maxUniformBufferBindingSize / (parameterTypes.length * kValueStride)
        );

      case 'storage_r':
      case 'storage_rw':
        return Math.floor(
          t.device.limits.maxStorageBufferBindingSize / (parameterTypes.length * kValueStride)
        );
    }
  })();

  for (let i = 0; i < cases.length; i += casesPerBatch) {
    const batchCases = cases.slice(i, Math.min(i + casesPerBatch, cases.length));
    runBatch(
      t,
      expressionBuilder,
      parameterTypes,
      returnType,
      batchCases,
      cfg.inputSource,
      cmpFloats
    );
  }
}

/**
 * Runs the list of expression tests. The input data must fit within the buffer
 * binding limits of the given inputSource.
 * @param t the GPUTest
 * @param expressionBuilder the expression builder function
 * @param parameterTypes the list of expression parameter types
 * @param returnType the return type for the expression overload
 * @param cases list of test cases that fit within the binding limits of the device
 * @param inputSource the source of the input values
 * @param cmpFloats the method to compare floating point numbers
 */
function runBatch(t, expressionBuilder, parameterTypes, returnType, cases, inputSource, cmpFloats) {
  // Construct a buffer to hold the results of the expression tests
  const outputBufferSize = cases.length * kValueStride;
  const outputBuffer = t.device.createBuffer({
    size: outputBufferSize,
    usage: GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST | GPUBufferUsage.STORAGE,
  });

  const [pipeline, group] = buildPipeline(
    t,
    expressionBuilder,
    parameterTypes,
    returnType,
    cases,
    inputSource,
    outputBuffer
  );

  const encoder = t.device.createCommandEncoder();
  const pass = encoder.beginComputePass();
  pass.setPipeline(pipeline);
  pass.setBindGroup(0, group);
  pass.dispatchWorkgroups(1);
  pass.end();

  t.queue.submit([encoder.finish()]);

  const checkExpectation = outputData => {
    // Read the outputs from the output buffer
    const outputs = new Array(cases.length);
    for (let i = 0; i < cases.length; i++) {
      outputs[i] = returnType.read(outputData, i * kValueStride);
    }

    // The list of expectation failures
    const errs = [];

    // For each case...
    for (let caseIdx = 0; caseIdx < cases.length; caseIdx++) {
      const c = cases[caseIdx];
      const got = outputs[caseIdx];
      const cmp = toComparator(c.expected)(got, cmpFloats);
      if (!cmp.matched) {
        errs.push(`(${c.input instanceof Array ? c.input.join(', ') : c.input})
    returned: ${cmp.got}
    expected: ${cmp.expected}`);
      }
    }

    return errs.length > 0 ? new Error(errs.join('\n\n')) : undefined;
  };

  t.expectGPUBufferValuesPassCheck(outputBuffer, checkExpectation, {
    type: Uint8Array,
    typedLength: outputBufferSize,
  });
}

/**
 * @param v either an array of T or a single element of type T
 * @param i the value index to
 * @returns the i'th value of v, if v is an array, otherwise v (i must be 0)
 */
function ith(v, i) {
  if (v instanceof Array) {
    assert(i < v.length);
    return v[i];
  }
  assert(i === 0);
  return v;
}

/**
 * Constructs and returns a GPUComputePipeline and GPUBindGroup for running a
 * batch of test cases.
 * @param t the GPUTest
 * @param expressionBuilder the expression builder function
 * @param parameterTypes the list of expression parameter types
 * @param returnType the return type for the expression overload
 * @param cases list of test cases that fit within the binding limits of the device
 * @param inputSource the source of the input values
 * @param outputBuffer the buffer that will hold the output values of the tests
 */
function buildPipeline(
  t,
  expressionBuilder,
  parameterTypes,
  returnType,
  cases,
  inputSource,
  outputBuffer
) {
  // wgsl declaration of output buffer and binding
  const wgslOutputs = `
struct Output {
  @size(${kValueStride}) value : ${storageType(returnType)}
};
@group(0) @binding(0) var<storage, read_write> outputs : array<Output, ${cases.length}>;
`;

  switch (inputSource) {
    case 'const': {
      //////////////////////////////////////////////////////////////////////////
      // Input values are constant values in the WGSL shader
      //////////////////////////////////////////////////////////////////////////
      const wgslCases = cases.map((c, caseIdx) => {
        const args = parameterTypes.map((_, i) => `(${ith(c.input, i).wgsl()})`);
        return `outputs[${caseIdx}].value = ${toStorage(returnType, expressionBuilder(args))};`;
      });

      // the full WGSL shader source
      const source = `
${wgslOutputs}

@compute @workgroup_size(1)
fn main() {
  ${wgslCases.join('\n   ')}
}
`;

      // build the shader module
      const module = t.device.createShaderModule({ code: source });

      // build the pipeline
      const pipeline = t.device.createComputePipeline({
        layout: 'auto',
        compute: { module, entryPoint: 'main' },
      });

      // build the bind group
      const group = t.device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [{ binding: 0, resource: { buffer: outputBuffer } }],
      });

      return [pipeline, group];
    }

    case 'uniform':
    case 'storage_r':
    case 'storage_rw': {
      //////////////////////////////////////////////////////////////////////////
      // Input values come from a uniform or storage buffer
      //////////////////////////////////////////////////////////////////////////

      // returns the WGSL expression to load the ith parameter of the given type from the input buffer
      const paramExpr = (ty, i) => fromStorage(ty, `inputs[i].param${i}`);

      // resolves to the expression that calls the builtin
      const expr = toStorage(returnType, expressionBuilder(parameterTypes.map(paramExpr)));

      // input binding var<...> declaration
      const wgslInputVar = (function () {
        switch (inputSource) {
          case 'storage_r':
            return 'var<storage, read>';
          case 'storage_rw':
            return 'var<storage, read_write>';
          case 'uniform':
            return 'var<uniform>';
        }
      })();

      // the full WGSL shader source
      const source = `
struct Input {
${parameterTypes
  .map((ty, i) => `  @size(${kValueStride}) param${i} : ${storageType(ty)},`)
  .join('\n')}
};

${wgslOutputs}

@group(0) @binding(1)
${wgslInputVar} inputs : array<Input, ${cases.length}>;

@compute @workgroup_size(1)
fn main() {
  for(var i = 0; i < ${cases.length}; i++) {
    outputs[i].value = ${expr};
  }
}
`;

      // size in bytes of the input buffer
      const inputSize = cases.length * parameterTypes.length * kValueStride;

      // Holds all the parameter values for all cases
      const inputData = new Uint8Array(inputSize);

      // Pack all the input parameter values into the inputData buffer
      {
        const caseStride = kValueStride * parameterTypes.length;
        for (let caseIdx = 0; caseIdx < cases.length; caseIdx++) {
          const caseBase = caseIdx * caseStride;
          for (let paramIdx = 0; paramIdx < parameterTypes.length; paramIdx++) {
            const offset = caseBase + paramIdx * kValueStride;
            const params = cases[caseIdx].input;
            if (params instanceof Array) {
              params[paramIdx].copyTo(inputData, offset);
            } else {
              params.copyTo(inputData, offset);
            }
          }
        }
      }

      // build the input buffer
      const inputBuffer = t.makeBufferWithContents(
        inputData,
        GPUBufferUsage.COPY_SRC |
          (inputSource === 'uniform' ? GPUBufferUsage.UNIFORM : GPUBufferUsage.STORAGE)
      );

      // build the shader module
      const module = t.device.createShaderModule({ code: source });

      // build the pipeline
      const pipeline = t.device.createComputePipeline({
        layout: 'auto',
        compute: { module, entryPoint: 'main' },
      });

      // build the bind group
      const group = t.device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: outputBuffer } },
          { binding: 1, resource: { buffer: inputBuffer } },
        ],
      });

      return [pipeline, group];
    }
  }
}

/**
 * Packs a list of scalar test cases into a smaller list of vector cases.
 * Requires that all parameters of the expression overload are of a scalar type,
 * and the return type of the expression overload is also a scalar type.
 * If `cases.length` is not a multiple of `vectorWidth`, then the last scalar
 * test case value is repeated to fill the vector value.
 */
function packScalarsToVector(parameterTypes, returnType, cases, vectorWidth) {
  // Validate that the parameters and return type are all vectorizable
  for (let i = 0; i < parameterTypes.length; i++) {
    const ty = parameterTypes[i];
    if (!(ty instanceof ScalarType)) {
      throw new Error(
        `packScalarsToVector() can only be used on scalar parameter types, but the ${i}'th parameter type is a ${ty}'`
      );
    }
  }
  if (!(returnType instanceof ScalarType)) {
    throw new Error(
      `packScalarsToVector() can only be used with a scalar return type, but the return type is a ${returnType}'`
    );
  }

  const packedCases = [];
  const packedParameterTypes = parameterTypes.map(p => TypeVec(vectorWidth, p));
  const packedReturnType = new VectorType(vectorWidth, returnType);

  const clampCaseIdx = idx => Math.min(idx, cases.length - 1);

  let caseIdx = 0;
  while (caseIdx < cases.length) {
    // Construct the vectorized inputs from the scalar cases
    const packedInputs = new Array(parameterTypes.length);
    for (let paramIdx = 0; paramIdx < parameterTypes.length; paramIdx++) {
      const inputElements = new Array(vectorWidth);
      for (let i = 0; i < vectorWidth; i++) {
        const input = cases[clampCaseIdx(caseIdx + i)].input;
        inputElements[i] = input instanceof Array ? input[paramIdx] : input;
      }
      packedInputs[paramIdx] = new Vector(inputElements);
    }

    // Gather the comparators for the packed cases
    const comparators = new Array(vectorWidth);
    for (let i = 0; i < vectorWidth; i++) {
      comparators[i] = toComparator(cases[clampCaseIdx(caseIdx + i)].expected);
    }
    const packedComparator = (got, cmpFloats) => {
      let matched = true;
      const gElements = new Array(vectorWidth);
      const eElements = new Array(vectorWidth);
      for (let i = 0; i < vectorWidth; i++) {
        const d = comparators[i](got.elements[i], cmpFloats);
        matched = matched && d.matched;
        gElements[i] = d.got;
        eElements[i] = d.expected;
      }
      return {
        matched,
        got: `${packedReturnType}(${gElements.join(', ')})`,
        expected: `${packedReturnType}(${eElements.join(', ')})`,
      };
    };

    // Append the new packed case
    packedCases.push({ input: packedInputs, expected: packedComparator });
    caseIdx += vectorWidth;
  }

  return {
    cases: packedCases,
    parameterTypes: packedParameterTypes,
    returnType: packedReturnType,
  };
}

/** @returns a set of flushed and non-flushed floating point results for a given number. */
function calculateFlushedResults(value) {
  return [f64(value), f64(flushSubnormalNumber(value))];
}

/**
 * Generates a Case for the param and unary op provide.
 * The Case will use either exact matching or the test level Comparator.
 * @param param the parameter to pass into the operation
 * @param op callback that implements the truth function for the unary operation
 */
export function makeUnaryF32Case(param, op) {
  const f32_param = quantizeToF32(param);
  const is_param_subnormal = isSubnormalNumber(f32_param);
  const expected = calculateFlushedResults(op(f32_param));
  if (is_param_subnormal) {
    calculateFlushedResults(op(0)).forEach(value => {
      expected.push(value);
    });
  }
  return { input: [f32(param)], expected: anyOf(...expected) };
}

/**
 * Generates a Case for the params and binary op provide.
 * The Case will use either exact matching or the test level Comparator.
 * @param param0 the first param or left hand side to pass into the binary operation
 * @param param1 the second param or rhs hand side to pass into the binary operation
 * @param op callback that implements the truth function for the binary operation
 * @param skip_param1_zero_flush should the builder skip cases where the param1 would be flushed to 0,
 *                               this is to avoid performing division by 0, other invalid operations.
 *                               The caller is responsible for making sure the initial param1 isn't 0.
 */
export function makeBinaryF32Case(param0, param1, op, skip_param1_zero_flush = false) {
  const f32_param0 = quantizeToF32(param0);
  const f32_param1 = quantizeToF32(param1);
  const is_param0_subnormal = isSubnormalNumber(f32_param0);
  const is_param1_subnormal = isSubnormalNumber(f32_param1);
  const expected = calculateFlushedResults(op(f32_param0, f32_param1));
  if (is_param0_subnormal) {
    calculateFlushedResults(op(0, f32_param1)).forEach(value => {
      expected.push(value);
    });
  }
  if (!skip_param1_zero_flush && is_param1_subnormal) {
    calculateFlushedResults(op(f32_param0, 0)).forEach(value => {
      expected.push(value);
    });
  }
  if (!skip_param1_zero_flush && is_param0_subnormal && is_param1_subnormal) {
    calculateFlushedResults(op(0, 0)).forEach(value => {
      expected.push(value);
    });
  }

  return { input: [f32(param0), f32(param1)], expected: anyOf(...expected) };
}

/**
 * Generates a Case for the param and unary interval generator provided.
 * The Case will use use an interval comparator for matching results.
 * @param param the param to pass into the unary operation
 * @param ops callbacks that implement generating an acceptance interval for a unary operation
 */
export function makeUnaryF32IntervalCase(param, ...ops) {
  param = quantizeToF32(param);
  const intervals = new Array();
  for (const op of ops) {
    intervals.push(op(param));
  }
  return { input: [f32(param)], expected: intervalComparator(...intervals) };
}

/**
 * Generates a Case for the params and binary interval generator provided.
 * The Case will use use an interval comparator for matching results.
 * @param param0 the first param or left hand side to pass into the binary operation
 * @param param1 the second param or rhs hand side to pass into the binary operation
 * @param ops callbacks that implement generating an acceptance interval for a binary operation
 */
// Will be used in test implementations

export function makeBinaryF32IntervalCase(param0, param1, ...ops) {
  param0 = quantizeToF32(param0);
  param1 = quantizeToF32(param1);
  const intervals = new Array();
  for (const op of ops) {
    intervals.push(op(param0, param1));
  }
  return { input: [f32(param0), f32(param1)], expected: intervalComparator(...intervals) };
}

/**
 * Generates a Case for the params and ternary interval generator provided.
 * The Case will use use an interval comparator for matching results.
 * @param param0 the first param to pass into the ternary operation
 * @param param1 the second param to pass into the ternary operation
 * @param param2 the third param to pass into the ternary operation
 * @param ops callbacks that implement generating an acceptance interval for a
 *           ternary operation.
 */
// Will be used in test implementations

export function makeTernaryF32IntervalCase(param0, param1, param2, ...ops) {
  param0 = quantizeToF32(param0);
  param1 = quantizeToF32(param1);
  param2 = quantizeToF32(param2);
  const intervals = new Array();
  for (const op of ops) {
    intervals.push(op(param0, param1, param2));
  }
  return {
    input: [f32(param0), f32(param1), f32(param2)],
    expected: intervalComparator(...intervals),
  };
}
