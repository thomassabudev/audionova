#!/usr/bin/env node

/**
 * 🔒 Security Verification Script
 * Checks for common security issues before pushing to GitHub
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

// Patterns for sensitive data
const SENSITIVE_PATTERNS = [
  // API Keys
  /api[_-]?key[_-]?=.+/i,
  /secret[_-]?key[_-]?=.+/i,
  /client[_-]?secret[_-]?=.+/i,
  
  // Database URLs with credentials
  /postgresql:\/\/[^:]+:[^@]+@/i,
  /mysql:\/\/[^:]+:[^@]+@/i,
  /mongodb:\/\/[^:]+:[^@]+@/i,
  
  // JWT Secrets
  /jwt[_-]?secret[_-]?=.+/i,
  
  // Firebase keys (actual keys, not placeholders)
  /AIza[0-9A-Za-z_-]{35}/,
  
  // Generic secrets
  /password[_-]?=.+/i,
  /token[_-]?=.+/i,
  
  // Private keys
  /-----BEGIN (RSA )?PRIVATE KEY-----/,
  /-----BEGIN OPENSSH PRIVATE KEY-----/
];

// Files that should never be committed
const FORBIDDEN_FILES = [
  '.env',
  '.env.local',
  '.env.development.local',
  '.env.test.local',
  '.env.production.local',
  'backend/.env',
  'backend/.env.local',
  '*.pem',
  '*.key',
  'config.json',
  'secrets.json',
  'credentials.json'
];

// Files that should exist
const REQUIRED_FILES = [
  '.env.example',
  'backend/.env.example',
  '.gitignore',
  'README.md'
];

function checkFileExists(filePath) {
  return fs.existsSync(filePath);
}

function readFileContent(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    return null;
  }
}

function checkGitIgnore() {
  logInfo('Checking .gitignore configuration...');
  
  const gitignorePath = '.gitignore';
  if (!checkFileExists(gitignorePath)) {
    logError('.gitignore file is missing!');
    return false;
  }
  
  const gitignoreContent = readFileContent(gitignorePath);
  const requiredPatterns = [
    '.env',
    '.env.*',
    'backend/.env',
    'node_modules/',
    '*.log'
  ];
  
  let allPatternsFound = true;
  
  for (const pattern of requiredPatterns) {
    if (!gitignoreContent.includes(pattern)) {
      logWarning(`Missing pattern in .gitignore: ${pattern}`);
      allPatternsFound = false;
    }
  }
  
  if (allPatternsFound) {
    logSuccess('.gitignore is properly configured');
  }
  
  return allPatternsFound;
}

function checkForbiddenFiles() {
  logInfo('Checking for forbidden files...');
  
  let foundForbidden = false;
  
  for (const pattern of FORBIDDEN_FILES) {
    if (pattern.includes('*')) {
      // Handle glob patterns (simplified)
      const extension = pattern.replace('*', '');
      const files = getAllFiles('.').filter(file => file.endsWith(extension));
      
      for (const file of files) {
        if (checkFileExists(file)) {
          logError(`Forbidden file found: ${file}`);
          foundForbidden = true;
        }
      }
    } else {
      if (checkFileExists(pattern)) {
        logError(`Forbidden file found: ${pattern}`);
        foundForbidden = true;
      }
    }
  }
  
  if (!foundForbidden) {
    logSuccess('No forbidden files found');
  }
  
  return !foundForbidden;
}

function checkRequiredFiles() {
  logInfo('Checking for required files...');
  
  let allRequired = true;
  
  for (const file of REQUIRED_FILES) {
    if (!checkFileExists(file)) {
      logError(`Required file missing: ${file}`);
      allRequired = false;
    } else {
      logSuccess(`Required file found: ${file}`);
    }
  }
  
  return allRequired;
}

function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      // Skip node_modules and .git directories
      if (file !== 'node_modules' && file !== '.git' && file !== 'dist' && file !== 'build') {
        getAllFiles(filePath, fileList);
      }
    } else {
      fileList.push(filePath);
    }
  }
  
  return fileList;
}

function scanForSensitiveData() {
  logInfo('Scanning for sensitive data in files...');
  
  const files = getAllFiles('.');
  const textFiles = files.filter(file => {
    const ext = path.extname(file).toLowerCase();
    return ['.js', '.ts', '.jsx', '.tsx', '.json', '.md', '.txt', '.yml', '.yaml', '.env'].includes(ext);
  });
  
  let foundSensitive = false;
  
  for (const file of textFiles) {
    // Skip .env.example files
    if (file.includes('.env.example')) {
      continue;
    }
    
    const content = readFileContent(file);
    if (!content) continue;
    
    for (const pattern of SENSITIVE_PATTERNS) {
      const matches = content.match(pattern);
      if (matches) {
        logWarning(`Potential sensitive data in ${file}: ${matches[0].substring(0, 50)}...`);
        foundSensitive = true;
      }
    }
  }
  
  if (!foundSensitive) {
    logSuccess('No sensitive data patterns found');
  }
  
  return !foundSensitive;
}

function checkGitStatus() {
  logInfo('Checking Git status...');
  
  try {
    // Check if .env files are tracked
    const trackedFiles = execSync('git ls-files', { encoding: 'utf8' });
    const envFiles = trackedFiles.split('\n').filter(file => 
      file.includes('.env') && !file.includes('.env.example')
    );
    
    if (envFiles.length > 0) {
      logError('Environment files are tracked by Git:');
      envFiles.forEach(file => logError(`  - ${file}`));
      return false;
    }
    
    logSuccess('No environment files are tracked by Git');
    return true;
  } catch (error) {
    logWarning('Could not check Git status (not a Git repository?)');
    return true;
  }
}

function checkEnvironmentFiles() {
  logInfo('Checking environment file configurations...');
  
  let allGood = true;
  
  // Check .env.example
  const envExample = readFileContent('.env.example');
  if (envExample) {
    if (envExample.includes('your_') || envExample.includes('_here')) {
      logSuccess('.env.example contains placeholder values');
    } else {
      logWarning('.env.example might contain real values instead of placeholders');
      allGood = false;
    }
  }
  
  // Check backend/.env.example
  const backendEnvExample = readFileContent('backend/.env.example');
  if (backendEnvExample) {
    if (backendEnvExample.includes('your_') || backendEnvExample.includes('_here')) {
      logSuccess('backend/.env.example contains placeholder values');
    } else {
      logWarning('backend/.env.example might contain real values instead of placeholders');
      allGood = false;
    }
  }
  
  return allGood;
}

function generateSecurityReport() {
  log('\n🔒 AudioNova Security Verification Report', 'bold');
  log('==========================================\n', 'bold');
  
  const checks = [
    { name: 'GitIgnore Configuration', fn: checkGitIgnore },
    { name: 'Forbidden Files Check', fn: checkForbiddenFiles },
    { name: 'Required Files Check', fn: checkRequiredFiles },
    { name: 'Git Status Check', fn: checkGitStatus },
    { name: 'Environment Files Check', fn: checkEnvironmentFiles },
    { name: 'Sensitive Data Scan', fn: scanForSensitiveData }
  ];
  
  let allPassed = true;
  const results = [];
  
  for (const check of checks) {
    const passed = check.fn();
    results.push({ name: check.name, passed });
    if (!passed) allPassed = false;
  }
  
  log('\n📊 Summary:', 'bold');
  log('===========');
  
  for (const result of results) {
    if (result.passed) {
      logSuccess(result.name);
    } else {
      logError(result.name);
    }
  }
  
  log('\n🎯 Overall Result:', 'bold');
  if (allPassed) {
    logSuccess('All security checks passed! ✨');
    logSuccess('Your project is ready to be pushed to GitHub safely.');
  } else {
    logError('Some security checks failed! ⚠️');
    logError('Please fix the issues above before pushing to GitHub.');
    log('\n💡 Quick fixes:', 'yellow');
    log('• Remove any .env files from the repository');
    log('• Add missing patterns to .gitignore');
    log('• Replace real API keys with placeholders in example files');
    log('• Create missing required files');
  }
  
  log('\n📚 Resources:', 'blue');
  log('• SECURITY_SETUP.md - Detailed security guide');
  log('• .env.example - Environment variable template');
  log('• setup-github.sh - Automated GitHub setup script');
  
  return allPassed;
}

// Run the security verification
const passed = generateSecurityReport();
process.exit(passed ? 0 : 1);