/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  images: { unoptimized: true },
  env: { NEXT_PUBLIC_CONTRACT_ADDRESS: "0x79435f6C549f67eb5e3B8d93b8089Df4239CF6A9" },
};
module.exports = nextConfig;
