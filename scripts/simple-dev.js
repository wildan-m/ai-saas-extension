#!/usr/bin/env node

/**
 * Simple concurrent development setup
 * Runs plasmo dev and periodically injects API keys
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting development server with periodic API key injection...');

// Start plasmo dev
const plasmoProcess = spawn('npx', ['plasmo', 'dev'], {
  stdio: ['inherit', 'inherit', 'inherit'],
  shell: true
});

// Function to inject API keys
function injectApiKeys() {
  console.log('🔧 Injecting API keys...');
  const { execSync } = require('child_process');
  try {
    execSync('node scripts/inject-env.js', { 
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });
    console.log('✅ API keys injected');
  } catch (error) {
    console.error('❌ Injection failed:', error.message);
  }
}

// Initial injection after 6 seconds (wait for first build)
setTimeout(injectApiKeys, 6000);

// Periodic injection every 30 seconds to catch any changes
const intervalId = setInterval(injectApiKeys, 30000);

console.log('💡 Tip: The extension will automatically inject API keys every 30 seconds');
console.log('💡 If you make changes, wait ~30 seconds or run "npm run inject-env" manually');

// Handle process termination
function cleanup() {
  console.log('\n🛑 Shutting down development server...');
  clearInterval(intervalId);
  plasmoProcess.kill('SIGINT');
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

plasmoProcess.on('exit', (code) => {
  console.log(`\n📋 Plasmo dev server exited with code ${code}`);
  clearInterval(intervalId);
  process.exit(code);
});