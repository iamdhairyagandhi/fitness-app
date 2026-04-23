// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Fix: Zustand 5.x ESM build uses `import.meta.env.MODE` which breaks
// Metro's classic script output on web. Force CJS resolution for zustand
// on web by redirecting to the .js (CJS) files instead of .mjs (ESM).
const originalResolveRequest = config.resolver?.resolveRequest;
config.resolver = {
  ...config.resolver,
  resolveRequest: (context, moduleName, platform) => {
    if (platform === 'web') {
      // Redirect zustand ESM imports to CJS
      if (moduleName === 'zustand' || moduleName === 'zustand/middleware' ||
          moduleName === 'zustand/vanilla' || moduleName === 'zustand/react') {
        const cjsPath = require.resolve(moduleName);
        return { filePath: cjsPath, type: 'sourceFile' };
      }
    }
    if (originalResolveRequest) {
      return originalResolveRequest(context, moduleName, platform);
    }
    return context.resolveRequest(context, moduleName, platform);
  },
};

module.exports = config;
