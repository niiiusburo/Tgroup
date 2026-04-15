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
    
    let gitCommit = 'unknown'
    let gitBranch = 'unknown'
    
    try {
      gitCommit = execSync('git rev-parse --short HEAD', { cwd: __dirname }).toString().trim()
      gitBranch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: __dirname }).toString().trim()
    } catch {
      // Git not available, use defaults
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
console.log('✅ Vite config loading with version:', versionInfo.version)

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    port: 5174,
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
