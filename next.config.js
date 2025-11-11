/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  webpack: (config, { isServer }) => {
    config.cache = false;
    return config;
  },
  // 移除output: 'export'以支持语音识别等动态功能
  // 语音识别需要动态服务器环境，不支持静态导出
};

module.exports = nextConfig;