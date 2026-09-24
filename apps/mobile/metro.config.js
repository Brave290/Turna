const path = require('path');
const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const packagesRoot = path.join(workspaceRoot, 'packages');
const configName = process.env.RN_CONFIG_NAME || 'index';

module.exports = mergeConfig(getDefaultConfig(projectRoot), {
  watchFolders: [
    path.join(workspaceRoot, 'node_modules'),
    packagesRoot,
  ],
  resolver: {
    unstable_enableSymlinks: true,
    unstable_enablePackageExports: false,
    nodeModulesPaths: [
      path.join(projectRoot, 'node_modules'),
      path.join(workspaceRoot, 'node_modules'),
    ],
    extraNodeModules: {
      '@turna/config': path.join(packagesRoot, 'config'),
      '@turna/types': path.join(packagesRoot, 'types'),
    },
    sourceExts: ['ts', 'tsx', 'js', 'jsx', 'json'],
  },
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
  },
});
