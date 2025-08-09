#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up Disaster Management Admin Panel...\n');

// Check if .env file exists
const envPath = path.join(__dirname, '.env');
const envExamplePath = path.join(__dirname, '.env.example');

if (!fs.existsSync(envPath)) {
  if (fs.existsSync(envExamplePath)) {
    // Copy .env.example to .env
    fs.copyFileSync(envExamplePath, envPath);
    console.log('✅ Created .env file from .env.example');
    console.log('📝 Please edit the .env file and add your Firebase credentials\n');
  } else {
    console.log('❌ .env.example file not found');
    process.exit(1);
  }
} else {
  console.log('✅ .env file already exists');
}

// Validate that all required packages are installed
try {
  require('dotenv');
  require('electron');
  require('firebase');
  require('chart.js');
  console.log('✅ All required packages are installed');
} catch (error) {
  console.log('❌ Some packages are missing. Please run: npm install');
  process.exit(1);
}

console.log('\n🎉 Setup completed successfully!');
console.log('\n📋 Next steps:');
console.log('1. Edit the .env file with your Firebase credentials');
console.log('2. Run "npm start" to launch the application');
console.log('3. Test the Firebase connection using the dashboard');
console.log('\n💡 For development mode with DevTools: npm run start:dev');
console.log('🚀 For production mode: npm run start:prod');
