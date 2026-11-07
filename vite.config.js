import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
    plugins: [react()],
    server: {
        host: true,
        port: 5173,
        strictPort: true,
        allowedHosts: ['h8ss72t0-5300.use.devtunnels.ms'],
        proxy: {
            "/api": {
                target: "http://localhost:8080",
                changeOrigin: true,
                configure(proxy) {
                    proxy.on("proxyReq", proxyReq => {
                        proxyReq.setHeader(
                            "origin",
                            "http://localhost:5173"
                        );
                    });
                }
            }
        }
    }
});
