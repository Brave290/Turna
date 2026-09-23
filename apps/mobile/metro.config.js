const path = require('path');
const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');
module.exports = mergeConfig(getDefaultConfig(projectRoot), {
  watchFolders: [path.join(workspaceRoot, 'node_modules')],
  resolver: {
    unstable_enableSymlinks: true,
    unstable_enablePackageExports: false,
    nodeModulesPaths: [
      path.join(workspaceRoot, 'node_modules'),
      path.join(projectRoot, 'node_modules'),
    ],
    sourceExts: ['ts', 'tsx', 'js', 'jsx', 'json'],
  },
});
