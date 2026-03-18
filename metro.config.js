const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

const { blockList } = config.resolver;
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

config.resolver.blockList = [
  ...(Array.isArray(blockList) ? blockList : blockList ? [blockList] : []),
  new RegExp(escape(path.join(__dirname, ".local")) + ".*"),
];

module.exports = config;
