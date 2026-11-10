// Privy Expo: jose must resolve its browser build; buffer is polyfilled.
const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);
const resolveRequestWithPackageExports = (context, moduleName, platform) => {
  if (moduleName === 'jose') return context.resolveRequest({ ...context, unstable_conditionNames: ['browser'] }, moduleName, platform);
  if (moduleName.startsWith('@privy-io/') || moduleName === 'isows' || moduleName.startsWith('zustand')) return context.resolveRequest({ ...context, unstable_enablePackageExports: true }, moduleName, platform);
  return context.resolveRequest(context, moduleName, platform);
};
config.resolver.resolveRequest = resolveRequestWithPackageExports;
module.exports = config;
