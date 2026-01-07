#!/usr/bin/env node

import { execSync } from 'child_process'
import { readFileSync } from 'fs'
import { resolve } from 'path'

console.log('🚀 Nuclear Frontend Build Verification')

// Check tsconfig.json isolation
const tsconfig = JSON.parse(readFileSync('./tsconfig.json', 'utf-8'))
const backendExcluded = tsconfig.exclude.includes('backend/**/*')
const frontendIncluded = tsconfig.include.includes('src/**/*')

if (!backendExcluded || !frontendIncluded) {
  console.error('❌ TypeScript configuration isolation failed')
  process.exit(1)
}

// Check .vercelignore exists
try {
  readFileSync('./.vercelignore')
  console.log('✅ Vercel ignore file present')
} catch {
  console.error('❌ .vercelignore file missing')
  process.exit(1)
}

// Run build
try {
  execSync('npm run build', { stdio: 'inherit' })
  console.log('✅ Nuclear build successful')
} catch (error) {
  console.error('❌ Build failed:', error)
  process.exit(1)
}

console.log('🎉 Nuclear frontend isolation verified!')
