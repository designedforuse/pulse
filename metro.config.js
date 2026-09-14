const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);
const { createProxyMiddleware } = require("http-proxy-middleware");

// Public Expo previews route to Metro. Forward API calls to Express rather
// than letting Expo Router answer them with the application's HTML shell.
const enhanceMiddleware = config.server.enhanceMiddleware;
config.server.enhanceMiddleware = (middleware, server) => {
  const next = enhanceMiddleware ? enhanceMiddleware(middleware, server) : middleware;
  const apiProxy = createProxyMiddleware({
    target: "http://127.0.0.1:5000",
    changeOrigin: true,
    pathFilter: "/api",
  });
  return (req, res, done) => {
    if (req.url === "/api" || req.url?.startsWith("/api/")) {
      return apiProxy(req, res, done);
    }
    return next(req, res, done);
  };
};

const { blockList } = config.resolver;
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

config.resolver.blockList = [
  ...(Array.isArray(blockList) ? blockList : blockList ? [blockList] : []),
  new RegExp(escape(path.join(__dirname, ".local")) + ".*"),
];

module.exports = config;
