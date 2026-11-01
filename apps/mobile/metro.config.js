const { getDefaultConfig } = require("expo/metro-config");
const { getSentryExpoConfig } = require("@sentry/react-native/metro");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");
const config = process.env.SENTRY_ORG && process.env.SENTRY_PROJECT
  ? getSentryExpoConfig(projectRoot)
  : getDefaultConfig(projectRoot);

config.watchFolders = Array.from(
  new Set([...(config.watchFolders ?? []), workspaceRoot])
);
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

config.resolver.assetExts = Array.from(new Set([...config.resolver.assetExts, "wasm"]));

const previousEnhanceMiddleware = config.server.enhanceMiddleware;
config.server.enhanceMiddleware = (middleware, server) => {
  const next = previousEnhanceMiddleware
    ? previousEnhanceMiddleware(middleware, server)
    : middleware;

  return (request, response, done) => {
    response.setHeader("Cross-Origin-Opener-Policy", "same-origin");
    response.setHeader("Cross-Origin-Embedder-Policy", "credentialless");
    return next(request, response, done);
  };
};

module.exports = config;
