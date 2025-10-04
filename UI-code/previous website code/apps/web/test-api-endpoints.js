const { fetch } = require('undici');

const API_BASE = process.env.API_BASE_URL?.replace(/\/$/, '') || 'http://localhost:4000';

async function makeRequest(path, { method = 'POST', body } = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const payload = await safeJson(response);
  return { status: response.status, payload };
}

async function safeJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function run() {
  console.log('dY"? Web storefront REST smoke test');

  const tests = [
    {
      name: 'Public products: getFeatured',
      path: '/api/public/products/get-featured',
      method: 'POST',
      acceptable: [200, 404],
    },
    {
      name: 'Public products: getAll',
      path: '/api/public/products/get-all',
      method: 'POST',
      body: { page: 1, limit: 12 },
      acceptable: [200, 404],
    },
    {
      name: 'Public categories: getAll',
      path: '/api/public/categories/get-all',
      method: 'POST',
      acceptable: [200, 404],
    },
  ];

  let passed = 0;

  for (const test of tests) {
    try {
      const result = await makeRequest(test.path, test);
      const ok = test.acceptable.includes(result.status);
      console.log(`${ok ? '?o.' : '??O'} ${test.name} (${result.status})`);
      if (!ok) {
        console.log('    Payload:', result.payload);
      }
      if (ok) passed++;
    } catch (error) {
      console.log(`??O ${test.name} (request error)`);
      console.log('    ', error.message);
    }
  }

  console.log(`\nPassed ${passed}/${tests.length} basic storefront checks`);
}

if (require.main === module) {
  run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
