const path = require('path');
const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');
const exclusionList = require('metro-config/src/defaults/exclusionList');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

module.exports = mergeConfig(getDefaultConfig(projectRoot), {
  watchFolders: [
    path.join(workspaceRoot, 'node_modules'),
    path.join(workspaceRoot, 'packages'),
  ],
  resolver: {
    unstable_enableSymlinks: true,
    unstable_enablePackageExports: false,
    nodeModulesPaths: [
      path.join(workspaceRoot, 'node_modules'),
      path.join(projectRoot, 'node_modules'),
    ],
    blockList: exclusionList([
      /\.git\//,
      /\.turbo\//,
      /\.next\//,
      /android\/build\//,
      /android\/\.gradle\//,
      /ios\/build\//,
      /ios\/Pods\//,
      /apps\/web\//,
      /supabase\//,
      /docs\//,
      /\.vercel\//,
    ]),
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
