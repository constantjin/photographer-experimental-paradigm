/// <reference types="vite-plugin-electron/electron-env" />

interface APIResponse {
  status: "success" | "error";
  message: string;
  data?: any;
  detailed?: string[];
}

declare namespace NodeJS {
  interface ProcessEnv {
    /**
     * The built directory structure
     *
     * ```tree
     * ├─┬ dist
     * │ ├─┬ electron
     * │ │ ├─┬ main
     * │ │ │ └── index.js
     * │ │ └─┬ preload
     * │ │   └── index.js
     * │ ├── index.html
     * │ ├── ...other-static-files-from-public
     * │
     * ```
     */
    DIST: string;
    /** /dist/ or /public/ */
    PUBLIC: string;
  }
}
