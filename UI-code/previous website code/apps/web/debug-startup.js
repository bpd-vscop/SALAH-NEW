// Debug script to identify startup issues
const fs = require('fs');
const path = require('path');

console.log('🔍 Debugging Next.js startup issues...\n');

// Check if critical files exist
const criticalFiles = [
  'app/page.tsx',
  'app/layout.tsx',
  'lib/api.ts',
  'components/providers/APIProvider.tsx',
  'next.config.js',
  'package.json'
];

console.log('📁 Checking critical files:');
criticalFiles.forEach(file => {
  const exists = fs.existsSync(file);
  console.log(`   ${exists ? '✅' : '❌'} ${file}`);
  
  if (!exists) {
    console.log(`      ❌ MISSING: ${file} - This could cause startup failures`);
  }
});

// Check package.json dependencies
console.log('\n📦 Checking package.json...');
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  console.log(`   ✅ Package name: ${packageJson.name}`);
  console.log(`   ✅ Next.js version: ${packageJson.dependencies?.next || 'not found'}`);
  console.log(`   ✅ React version: ${packageJson.dependencies?.react || 'not found'}`);
} catch (error) {
  console.log(`   ❌ Error reading package.json: ${error.message}`);
}

// Check if node_modules exist
console.log('\n📚 Checking dependencies:');
const nodeModulesExists = fs.existsSync('node_modules');
console.log(`   ${nodeModulesExists ? '✅' : '❌'} node_modules directory`);

if (nodeModulesExists) {
  const nextExists = fs.existsSync('node_modules/next');
  console.log(`   ${nextExists ? '✅' : '❌'} Next.js installed`);
  
  const reactExists = fs.existsSync('node_modules/react');
  console.log(`   ${reactExists ? '✅' : '❌'} React installed`);
}

// Check main page for syntax issues
console.log('\n📄 Checking main page file:');
try {
  const pageContent = fs.readFileSync('app/page.tsx', 'utf8');
  
  // Basic syntax checks
  const hasImports = pageContent.includes('import');
  const hasExport = pageContent.includes('export default');
  const hasReact = pageContent.includes('React') || pageContent.includes('useState') || pageContent.includes('use');
  
  console.log(`   ${hasImports ? '✅' : '❌'} Has imports`);
  console.log(`   ${hasExport ? '✅' : '❌'} Has default export`);
  console.log(`   ${hasReact ? '✅' : '❌'} Uses React features`);
  
  // Check for potential issues
  const hasAPI = pageContent.includes('API');
  const hasComponents = pageContent.includes('CategoryGrid') || pageContent.includes('FeaturedProducts');
  
  console.log(`   ${hasAPI ? '✅' : '❌'} Uses API`);
  console.log(`   ${hasComponents ? '✅' : '❌'} Uses custom components`);
  
} catch (error) {
  console.log(`   ❌ Error reading page.tsx: ${error.message}`);
}

// Check for common Next.js issues
console.log('\n⚠️  Common Issues Check:');

try {
  const nextConfig = fs.readFileSync('next.config.js', 'utf8');
  
  // Check for problematic configurations
  if (nextConfig.includes('CUSTOM_KEY') && !process.env.CUSTOM_KEY) {
    console.log('   ⚠️  CUSTOM_KEY environment variable missing');
  }
  
  if (nextConfig.includes('experimental')) {
    console.log('   ⚠️  Uses experimental Next.js features');
  }
  
} catch (error) {
  console.log(`   ❌ Error reading next.config.js: ${error.message}`);
}

// Provide recommendations
console.log('\n💡 Recommendations:');
console.log('   1. Ensure all dependencies are installed: npm install');
console.log('   2. Clear Next.js cache: npm run build or delete .next folder');  
console.log('   3. Check for TypeScript errors: npx tsc --noEmit');
console.log('   4. Try starting on different port: npm run dev -- --port 3003');
console.log('   5. Check browser console for client-side errors');

console.log('\n🎯 Next Steps:');
console.log('   • If files are missing, they need to be created');
console.log('   • If dependencies are missing, run npm install');
console.log('   • If syntax errors exist, fix them before starting server');
console.log('   • Clear browser cache and try different ports');

console.log('\n✅ Diagnostic complete!');
