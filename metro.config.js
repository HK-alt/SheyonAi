// Learn more https://docs.expo.io/guides/customizing-metro
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// mathlive's package "exports" use nested browser/production conditions Metro
// does not resolve for platform=web, which spams WARN logs. Pin the entry.
// Expo static web SSR runs in Node (`resolver.environment=node`); the browser
// build extends HTMLElement and throws "HTMLElement is not defined" there.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'mathlive') {
    const env = context.customResolverOptions?.environment;
    const useSsr = env === 'node' || env === 'react-server';
    return {
      filePath: path.resolve(
        __dirname,
        useSsr
          ? 'node_modules/mathlive/mathlive-ssr.min.mjs'
          : 'node_modules/mathlive/mathlive.min.mjs',
      ),
      type: 'sourceFile',
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
