#!/usr/bin/env node

/**
 * Environment Variable Injection Script for Plasmo
 * 
 * This script injects private environment variables into the built extension
 * since Plasmo only auto-injects PLASMO_PUBLIC_* variables.
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config();

function injectEnvironmentVariables() {
  console.log('🔧 Injecting environment variables...');
  
  // Get API keys from environment
  const openaiKey = process.env.OPENAI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  
  console.log('📋 Environment variables found:', {
    OPENAI_API_KEY: openaiKey ? `${openaiKey.substring(0, 10)}...` : 'not set',
    ANTHROPIC_API_KEY: anthropicKey ? `${anthropicKey.substring(0, 10)}...` : 'not set',
    NODE_ENV: process.env.NODE_ENV
  });
  
  // Find config files in build directory
  const buildDir = path.join(__dirname, '..', 'build');
  const configFiles = findConfigFiles(buildDir);
  
  if (configFiles.length === 0) {
    console.log('⚠️  No config files found. Make sure to run this after build.');
    return;
  }
  
  configFiles.forEach(filePath => {
    console.log(`📝 Processing: ${path.relative(buildDir, filePath)}`);
    
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Inject OpenAI API key
    if (openaiKey && openaiKey !== 'sk-your-openai-api-key-here') {
      const oldContent = content;
      // Replace the constant definition
      content = content.replace(/"INJECT_OPENAI_KEY_HERE"/g, `"${openaiKey}"`);
      // Also fix any comparison that may have been incorrectly replaced
      content = content.replace(new RegExp(`!== "${openaiKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`, 'g'), '!== "INJECT_OPENAI_KEY_HERE"');
      if (content !== oldContent) {
        modified = true;
        console.log('  ✅ Injected OpenAI API key');
      }
    }
    
    // Inject Anthropic API key  
    if (anthropicKey && anthropicKey !== 'your-anthropic-api-key-here') {
      const oldContent = content;
      content = content.replace(/"INJECT_ANTHROPIC_KEY_HERE"/g, `"${anthropicKey}"`);
      if (content !== oldContent) {
        modified = true;
        console.log('  ✅ Injected Anthropic API key');
      }
    }
    
    if (modified) {
      fs.writeFileSync(filePath, content);
      console.log('  💾 File updated');
    } else {
      console.log('  ⏭️  No changes needed');
    }
  });
  
  console.log('✨ Environment variable injection complete!');
}

function findConfigFiles(dir) {
  const configFiles = [];
  
  function searchDir(currentDir) {
    const files = fs.readdirSync(currentDir);
    
    files.forEach(file => {
      const filePath = path.join(currentDir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        searchDir(filePath);
      } else if (file.endsWith('.js')) {
        // Check if file contains our injection markers
        const content = fs.readFileSync(filePath, 'utf8');
        if (content.includes('INJECT_OPENAI_KEY_HERE') || 
            content.includes('INJECT_ANTHROPIC_KEY_HERE')) {
          configFiles.push(filePath);
        }
      }
    });
  }
  
  if (fs.existsSync(dir)) {
    searchDir(dir);
  }
  
  return configFiles;
}

// Run the injection
injectEnvironmentVariables();