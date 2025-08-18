// src/setupProxy.js
const { createProxyMiddleware } = require("http-proxy-middleware");

module.exports = function (app) {
  app.use(
    "/api",
    createProxyMiddleware({
      target: "http://localhost:8080",
      changeOrigin: true,
      // 필요 시 WebSocket: ws: true
      // pathRewrite: { "^/api": "" }, // 서버가 /itda/... 바로 받는다면 주석 해제
    })
  );
};
