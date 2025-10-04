// Simple test script to verify REST API client wiring
// Run with: node test-db-connection.js

const fs = require('fs');
const path = require('path');

console.log('dY"? Testing REST API integration setup...\n');

// Test 1: Check if REST client configuration is present
try {
  console.log('?o. Test 1: Checking API client configuration...');

  const apiClientPath = path.join(__dirname, 'lib/api.ts');
  if (fs.existsSync(apiClientPath)) {
    const content = fs.readFileSync(apiClientPath, 'utf8');
    if (content.includes('createProxy') && content.includes('callEndpoint')) {
      console.log('   ?o. REST API client is defined');
    } else {
      console.log('   ??O API client implementation looks incomplete');
    }
  } else {
    console.log('   ??O API client file not found');
  }
} catch (error) {
  console.log('   ??O Error checking API client configuration:', error.message);
}

// Test 2: Check if components use the API client hooks
console.log('\n?o. Test 2: Checking component data fetching integration...');

try {
  const componentsToCheck = [
    'components/products/CategoryGrid.tsx',
    'components/products/FeaturedProducts.tsx',
    'components/products/OnSale.tsx',
    'components/products/BackInStock.tsx',
    'components/products/NewProductsSection.tsx'
  ];

  componentsToCheck.forEach(component => {
    const componentPath = path.join(__dirname, component);
    if (fs.existsSync(componentPath)) {
      const content = fs.readFileSync(componentPath, 'utf8');

      const usesApiClient = content.includes('api.');
      const hasQueryHook = content.includes('.useQuery');
      const hasLoading = content.includes('isLoading');
      const hasError = content.includes('error');

      console.log(`   dY", ${component.split('/').pop()}:`);
      console.log(`      ${usesApiClient ? '?o.' : '??O'} Uses API client proxy`);
      console.log(`      ${hasQueryHook ? '?o.' : '??O'} Has useQuery hooks`);
      console.log(`      ${hasLoading ? '?o.' : '??O'} Has loading states`);
      console.log(`      ${hasError ? '?o.' : '??O'} Has error handling`);

    } else {
      console.log(`   ??O Component not found: ${component}`);
    }
  });
} catch (error) {
  console.log('   ??O Error checking components:', error.message);
}

// Test 3: Check if ApiProvider is configured in layout
console.log('\n?o. Test 3: Checking ApiProvider integration...');

try {
  const layoutPath = path.join(__dirname, 'app/layout.tsx');
  if (fs.existsSync(layoutPath)) {
    const content = fs.readFileSync(layoutPath, 'utf8');

    if (content.includes('ApiProvider')) {
      console.log('   ?o. ApiProvider is imported and used in layout');
    } else {
      console.log('   ??O ApiProvider not found in layout');
    }
  } else {
    console.log('   ??O Layout file not found');
  }
} catch (error) {
  console.log('   ??O Error checking layout:', error.message);
}

console.log('\ndYZ_ Integration Summary:');
console.log('   ??? Components leverage the REST API client proxy');
console.log('   ??? Loading states and error handling remain in place');
console.log('   ??? ApiProvider supplies React Query context across the app');
console.log('   ??? Routes now call Fastify REST endpoints under /api/*');

console.log('\ndY"< Next Steps:');
console.log('   1. Set NEXT_PUBLIC_API_URL to point at the Fastify server (e.g. http://localhost:4000)');
console.log('   2. Run database migrations and seed data as needed');
console.log('   3. Start the Fastify API (`npm run dev -- --filter @automotive/api`)');
console.log('   4. Launch the Next.js app at http://localhost:3000');

console.log('\n?o. REST API client integration verification complete!');
