#!/usr/bin/env node

/**
 * Development server with automatic API key injection
 * 
 * This script starts Plasmo dev server and watches for build changes
 * to automatically inject API keys whenever files are rebuilt.
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');

console.log('🚀 Starting development server with automatic API key injection...');

// Start plasmo dev in background
const plasmoProcess = spawn('npx', ['plasmo', 'dev'], {
  stdio: ['inherit', 'inherit', 'inherit'],
  shell: true
});

// Wait for initial build, then start watching
setTimeout(() => {
  console.log('👀 Watching for build changes to inject API keys...');
  
  const buildDir = path.join(__dirname, '..', 'build', 'chrome-mv3-dev');
  
  // Watch for changes in the build directory
  const watcher = chokidar.watch(buildDir, {
    ignored: /node_modules/,
    persistent: true,
    ignoreInitial: false // Inject on startup too
  });

  let isInjecting = false;
  
  watcher.on('change', async (filePath) => {
    // Only inject for JavaScript files that might contain our config
    if (filePath.endsWith('.js') && !isInjecting) {
      isInjecting = true;
      
      console.log('🔄 Build change detected, injecting API keys...');
      
      try {
        // Run injection script
        const { execSync } = require('child_process');
        execSync('node scripts/inject-env.js', { 
          stdio: 'inherit',
          cwd: path.join(__dirname, '..')
        });
        console.log('✅ API keys injected successfully');
      } catch (error) {
        console.error('❌ Failed to inject API keys:', error.message);
      }
      
      // Debounce to avoid multiple rapid injections
      setTimeout(() => {
        isInjecting = false;
      }, 2000);
    }
  });

  // Initial injection
  setTimeout(() => {
    console.log('🔧 Running initial API key injection...');
    try {
      const { execSync } = require('child_process');
      execSync('node scripts/inject-env.js', { 
        stdio: 'inherit',
        cwd: path.join(__dirname, '..')
      });
      console.log('✅ Initial API key injection complete');
    } catch (error) {
      console.error('❌ Initial injection failed:', error.message);
    }
  }, 3000);

}, 5000); // Wait 5 seconds for initial build

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down development server...');
  plasmoProcess.kill('SIGINT');
  process.exit(0);
});

process.on('SIGTERM', () => {
  plasmoProcess.kill('SIGTERM');
  process.exit(0);
});

plasmoProcess.on('exit', (code) => {
  console.log(`\n📋 Plasmo dev server exited with code ${code}`);
  process.exit(code);
});