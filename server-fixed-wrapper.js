import express from 'express';

const originalSend = express.response.send;
express.response.send = function patchedSend(body) {
  try {
    if (this.req?.path === '/admin' && typeof body === 'string' && body.includes('Loading admin data')) {
      body = body.replace(/<script>\s*const content=document\.getElementById\('content'\);[\s\S]*?<\/script><\/body><\/html>$/, '<script src="/admin-fix.js"></script></body></html>');
    }
    if (this.req?.path === '/' && typeof body === 'string' && body.includes('Global Passport')) {
      body = body.replace('</body>', '<script src="/rewards-prototype.js"></script><script src="/stamp-style-v2.js"></script></body>');
    }
  } catch {}
  return originalSend.call(this, body);
};

await import('./server.js');
