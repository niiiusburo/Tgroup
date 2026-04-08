import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'
import { execSync } from 'child_process'

// Generate version info
function getVersionInfo() {
  const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'))
  
  let gitCommit = 'unknown'
  let gitBranch = 'unknown'
  
  try {
    gitCommit = execSync('git rev-parse --short HEAD').toString().trim()
    gitBranch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim()
  } catch {
    // Git not available, use defaults
  }
  
  return {
    version: packageJson.version,
    buildTime: new Date().toISOString(),
    gitCommit,
    gitBranch,
  }
}

const versionInfo = getVersionInfo()

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'generate-version',
      buildStart() {
        // Generate version.json during build
        const versionJson = JSON.stringify(versionInfo, null, 2)
        fs.mkdirSync('./dist', { recursive: true })
        fs.writeFileSync('./dist/version.json', versionJson)
        console.log('✅ Generated version.json:', versionInfo)
      },
    },
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  define: {
    // Inject version into the app
    __APP_VERSION__: JSON.stringify(versionInfo.version),
    __APP_BUILD_TIME__: JSON.stringify(versionInfo.buildTime),
    __APP_GIT_COMMIT__: JSON.stringify(versionInfo.gitCommit),
    __APP_GIT_BRANCH__: JSON.stringify(versionInfo.gitBranch),
  },
})
