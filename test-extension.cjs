#!/usr/bin/env node

/**
 * Simple test to verify the extension is built correctly
 */

const fs = require('fs');
const path = require('path');

const distPath = path.join(__dirname, 'dist');

console.log('🔍 Testing Chrome Extension Build...\n');

// Check if dist directory exists
if (!fs.existsSync(distPath)) {
  console.error('❌ dist directory not found');
  process.exit(1);
}

// Required files for Chrome extension
const requiredFiles = [
  'manifest.json',
  'background.js',
  'content.js',
  'popup.js',
  'options.html',
  'options.js',
  '_locales/en/messages.json',
  '_locales/ja/messages.json',
  'icons/icon16.png',
  'icons/icon32.png',
  'icons/icon48.png',
  'icons/icon128.png'
];

let allFilesExist = true;

console.log('📁 Checking required files:');
requiredFiles.forEach(file => {
  const filePath = path.join(distPath, file);
  const exists = fs.existsSync(filePath);
  console.log(`  ${exists ? '✅' : '❌'} ${file}`);
  if (!exists) allFilesExist = false;
});

// Check manifest.json structure
console.log('\n📋 Checking manifest.json:');
try {
  const manifestPath = path.join(distPath, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  
  const requiredManifestFields = [
    'manifest_version',
    'name',
    'version',
    'description',
    'permissions',
    'background',
    'action',
    'commands'
  ];
  
  requiredManifestFields.forEach(field => {
    const exists = manifest.hasOwnProperty(field);
    console.log(`  ${exists ? '✅' : '❌'} ${field}`);
    if (!exists) allFilesExist = false;
  });
  
  // Check if manifest version is 3
  if (manifest.manifest_version === 3) {
    console.log('  ✅ Manifest V3');
  } else {
    console.log('  ❌ Not Manifest V3');
    allFilesExist = false;
  }
  
} catch (error) {
  console.log('  ❌ Failed to parse manifest.json');
  allFilesExist = false;
}

// Check file sizes
console.log('\n📊 File sizes:');
requiredFiles.forEach(file => {
  const filePath = path.join(distPath, file);
  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    const size = (stats.size / 1024).toFixed(2);
    console.log(`  ${file}: ${size} KB`);
  }
});

// Final result
console.log('\n🎯 Test Results:');
if (allFilesExist) {
  console.log('✅ All tests passed! Extension is ready to load in Chrome.');
  console.log('\n📝 To load in Chrome:');
  console.log('1. Open Chrome and go to chrome://extensions/');
  console.log('2. Enable "Developer mode" (top right)');
  console.log('3. Click "Load unpacked" and select the dist/ folder');
  console.log('4. Test the extension by selecting text and pressing Ctrl+Shift+G');
} else {
  console.log('❌ Some tests failed. Check the build process.');
  process.exit(1);
} 