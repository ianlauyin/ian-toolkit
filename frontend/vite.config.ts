/// <reference types="vitest/config" />
import {fileURLToPath, URL} from "node:url";
import {defineConfig} from "vite";
import solid from "@solidjs/vite-plugin";

export default defineConfig({
    plugins: [solid()],
    resolve: {
        alias: [
            {find: "component/", replacement: fileURLToPath(new URL("./src/component/", import.meta.url))},
            {find: "util/", replacement: fileURLToPath(new URL("./src/util/", import.meta.url))},
            {find: "module/", replacement: fileURLToPath(new URL("./src/module/", import.meta.url))},
        ],
    },
    test: {
        environment: "node",
    },
    optimizeDeps: {
        exclude: ["ian-framework-fe"],
    },
    server: {
        host: "127.0.0.1",
        port: 5173,
        proxy: {
            "/api": "http://127.0.0.1:47322",
            "/version": "http://127.0.0.1:47322",
            "/health": "http://127.0.0.1:47322",
        },
    },
});
