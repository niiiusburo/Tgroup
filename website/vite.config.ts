import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'
import { execSync } from 'child_process'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Generate version info - MUST be called at config load time
function getVersionInfo() {
  try {
    const packagePath = path.resolve(__dirname, 'package.json')
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'))
    
    let gitCommit = process.env.GIT_SHA || process.env.GIT_COMMIT || 'unknown'
    let gitBranch = process.env.GIT_BRANCH || 'unknown'

    if (gitCommit !== 'unknown') {
      gitCommit = gitCommit.slice(0, 7)
    } else {
      try {
        gitCommit = execSync('git rev-parse --short HEAD', { cwd: __dirname }).toString().trim()
        gitBranch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: __dirname }).toString().trim()
      } catch {
        // Git not available and no build env was passed, use defaults.
      }
    }
    
    return {
      version: packageJson.version,
      buildTime: new Date().toISOString(),
      gitCommit,
      gitBranch,
    }
  } catch (error) {
    console.error('Error reading version info:', error)
    return {
      version: '0.0.0',
      buildTime: new Date().toISOString(),
      gitCommit: 'unknown',
      gitBranch: 'unknown',
    }
  }
}

const versionInfo = getVersionInfo()
// index.html uses %VITE_APP_VERSION%; set before config load so dev + build both substitute it.
process.env.VITE_APP_VERSION = versionInfo.version
console.log('✅ Vite config loading with version:', versionInfo.version)

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    port: 5175,
    strictPort: true,
    host: true,
  },
  plugins: [
    react(),
    {
      name: 'generate-version',
      buildStart() {
        // Generate version.json during build
        try {
          const versionJson = JSON.stringify(versionInfo, null, 2)
          const distPath = path.resolve(__dirname, 'dist')
          fs.mkdirSync(distPath, { recursive: true })
          fs.writeFileSync(path.resolve(distPath, 'version.json'), versionJson)
          console.log('✅ Generated version.json:', versionInfo)
        } catch (error) {
          console.error('Error generating version.json:', error)
        }
      },
    },
  ],
  // Vendor splitting so the main `index-*.js` chunk stays under the 500 KB warning
  // limit. NK3 target is mobile clinic staff in Vietnam on slow connections, so a
  // 577 KB main chunk was a real first-load penalty. Reference: bulletproof-react
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('framer-motion')) return 'vendor-motion';
            if (id.includes('lucide-react')) return 'vendor-icons';
            if (id.includes('react-i18next') || id.includes('/i18next/')) return 'vendor-i18n';
            if (id.includes('react-router')) return 'vendor-router';
            if (id.includes('xlsx-js-style') || id.includes('/xlsx/')) return 'vendor-xlsx';
            if (id.includes('zod')) return 'vendor-zod';
            // React core only (avoid catching react-i18next, react-router, react-dom/server, etc.)
            if (id.includes('react-dom') || id.includes('/react-dom/') || id.includes('node_modules/react/')) return 'vendor-react';
            // No catch-all `vendor` chunk — returning undefined lets Rollup pick the
            // optimal chunk graph and avoids circular vendor <-> vendor-react deps.
            return undefined;
          }
          if (id.includes('@tgroup/contracts')) return 'contracts';
          return undefined; // let Vite handle app code
        },
      },
    },
    chunkSizeWarningLimit: 500,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  define: {
    // Inject version into the app - use globalThis to ensure availability
    'globalThis.__APP_VERSION__': JSON.stringify(versionInfo.version),
    'globalThis.__APP_BUILD_TIME__': JSON.stringify(versionInfo.buildTime),
    'globalThis.__APP_GIT_COMMIT__': JSON.stringify(versionInfo.gitCommit),
    'globalThis.__APP_GIT_BRANCH__': JSON.stringify(versionInfo.gitBranch),
    // Also define as regular constants for compatibility
    __APP_VERSION__: JSON.stringify(versionInfo.version),
    __APP_BUILD_TIME__: JSON.stringify(versionInfo.buildTime),
    __APP_GIT_COMMIT__: JSON.stringify(versionInfo.gitCommit),
    __APP_GIT_BRANCH__: JSON.stringify(versionInfo.gitBranch),
  },
})
