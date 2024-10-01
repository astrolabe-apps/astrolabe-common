module.exports = function (api) {
  api.cache(true);
  const plugins = ['module:@react-typed-forms/transform'];

  return {
    presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }], 'nativewind/babel'],

    plugins,
  };
};
