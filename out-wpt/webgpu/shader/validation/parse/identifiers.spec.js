/**
 * AUTO-GENERATED - DO NOT EDIT. Source: https://github.com/gpuweb/cts
 **/ export const description = `Validation tests for identifiers`;
import { makeTestGroup } from '../../../../common/framework/test_group.js';
import { ShaderValidationTest } from '../shader_validation_test.js';

export const g = makeTestGroup(ShaderValidationTest);

const kValidIdentifiers = new Set([
  'foo',
  'Foo',
  'FOO',
  '_0',
  '_foo0',
  '_0foo',
  'foo__0',
  'Δέλτα',
  'réflexion',
  'Кызыл',
  '𐰓𐰏𐰇',
  '朝焼け',
  'سلام',
  '검정',
  'שָׁלוֹם',
  'गुलाबी',
  'փիրուզ',
]);

const kInvalidIdentifiers = new Set([
  '_', // Single underscore is a syntactic token for phony assignment.
  '__', // Leading double underscore is reserved.
  '__foo', // Leading double underscore is reserved.
  '0foo', // Must start with single underscore or a letter.
  // No punctuation:
  'foo.bar',
  'foo-bar',
  'foo+bar',
  'foo#bar',
  'foo!bar',
  'foo\\bar',
  'foo/bar',
  'foo,bar',
  'foo@bar',
  'foo::bar',
  // Type-defining Keywords:
  'array',
  'atomic',
  'bool',
  'f32',
  'f16',
  'i32',
  'mat2x2',
  'mat2x3',
  'mat2x4',
  'mat3x2',
  'mat3x3',
  'mat3x4',
  'mat4x2',
  'mat4x3',
  'mat4x4',
  'ptr',
  'sampler',
  'sampler_comparison',
  'texture_1d',
  'texture_2d',
  'texture_2d_array',
  'texture_3d',
  'texture_cube',
  'texture_cube_array',
  'texture_multisampled_2d',
  'texture_storage_1d',
  'texture_storage_2d',
  'texture_storage_2d_array',
  'texture_storage_3d',
  'texture_depth_2d',
  'texture_depth_2d_array',
  'texture_depth_cube',
  'texture_depth_cube_array',
  'texture_depth_multisampled_2d',
  'u32',
  'vec2',
  'vec3',
  'vec4',
  // Other Keywords:
  'bitcast',
  'break',
  'case',
  'const',
  'continue',
  'continuing',
  'default',
  'discard',
  'else',
  'enable',
  'false',
  'fn',
  'for',
  'if',
  'let',
  'loop',
  'override',
  'return',
  'static_assert',
  'struct',
  'switch',
  'true',
  'type',
  'var',
  'while',
  // Reserved Words
  'CompileShader',
  'ComputeShader',
  'DomainShader',
  'GeometryShader',
  'Hullshader',
  'NULL',
  'Self',
  'abstract',
  'active',
  'alignas',
  'alignof',
  'as',
  'asm',
  'asm_fragment',
  'async',
  'attribute',
  'auto',
  'await',
  'become',
  'binding_array',
  'cast',
  'catch',
  'class',
  'co_await',
  'co_return',
  'co_yield',
  'coherent',
  'column_major',
  'common',
  'compile',
  'compile_fragment',
  'concept',
  'const_cast',
  'consteval',
  'constexpr',
  'constinit',
  'crate',
  'debugger',
  'decltype',
  'delete',
  'demote',
  'demote_to_helper',
  'do',
  'dynamic_cast',
  'enum',
  'explicit',
  'export',
  'extends',
  'extern',
  'external',
  'fallthrough',
  'filter',
  'final',
  'finally',
  'friend',
  'from',
  'fxgroup',
  'get',
  'goto',
  'groupshared',
  'handle',
  'highp',
  'impl',
  'implements',
  'import',
  'inline',
  'inout',
  'instanceof',
  'interface',
  'layout',
  'lowp',
  'macro',
  'macro_rules',
  'match',
  'mediump',
  'meta',
  'mod',
  'module',
  'move',
  'mut',
  'mutable',
  'namespace',
  'new',
  'nil',
  'noexcept',
  'noinline',
  'nointerpolation',
  'noperspective',
  'null',
  'nullptr',
  'of',
  'operator',
  'package',
  'packoffset',
  'partition',
  'pass',
  'patch',
  'pixelfragment',
  'precise',
  'precision',
  'premerge',
  'priv',
  'protected',
  'pub',
  'public',
  'readonly',
  'ref',
  'regardless',
  'register',
  'reinterpret_cast',
  'requires',
  'resource',
  'restrict',
  'self',
  'set',
  'shared',
  'signed',
  'sizeof',
  'smooth',
  'snorm',
  'static',
  'static_cast',
  'std',
  'subroutine',
  'super',
  'target',
  'template',
  'this',
  'thread_local',
  'throw',
  'trait',
  'try',
  'typedef',
  'typeid',
  'typename',
  'typeof',
  'union',
  'unless',
  'unorm',
  'unsafe',
  'unsized',
  'use',
  'using',
  'varying',
  'virtual',
  'volatile',
  'wgsl',
  'where',
  'with',
  'writeonly',
  'yield',
]);

g.test('identifiers')
  .desc(`Test that valid identifiers are accepted, and invalid identifiers are rejected.`)
  .params(u =>
    u.combine('ident', new Set([...kValidIdentifiers, ...kInvalidIdentifiers])).beginSubcases()
  )
  .fn(t => {
    const code = `var<private> ${t.params.ident} : i32;`;
    t.expectCompileResult(kValidIdentifiers.has(t.params.ident), code);
  });

g.test('non_normalized')
  .desc(`Test that identifiers are not unicode normalized`)
  .fn(t => {
    const code = `var<private> \u212b : i32;  // \u212b normalizes with NFC to \u00c5
var<private> \u00c5 : i32;`;
    t.expectCompileResult(true, code);
  });
