const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

// Get the root of the SDK (two directories up from mobile example)
const sdkRoot = path.resolve(__dirname, "../..");

const config = getDefaultConfig(__dirname);

// Watch the SDK directory for changes
config.watchFolders = [sdkRoot];

// Explicitly tell Metro where to find the 'x' package
config.resolver.extraNodeModules = {
  x: sdkRoot,
};

// Make sure Metro can resolve modules from both the SDK and mobile example
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, "node_modules"),
  path.resolve(sdkRoot, "node_modules"),
];

module.exports = config;
