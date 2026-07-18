import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	output: "standalone",
	outputFileTracingRoot: path.join(__dirname),
	webpack: (config, { dev }) => {
		if (dev) {
			config.cache = false;
		}
		return config;
	},
};

export default nextConfig;
