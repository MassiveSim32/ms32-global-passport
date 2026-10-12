import express from 'express';

const originalSend = express.response.send;
express.response.send = function patchedSend(body) {
  try {
    if (this.req?.path === '/admin' && typeof body === 'string' && body.includes('Loading admin data')) {
      body = body.replace(/<script>\s*const content=document\.getElementById\('content'\);[\s\S]*?<\/script><\/body><\/html>$/, '<script src="/admin-fix.js"></script></body></html>');
    }
  } catch {}
  return originalSend.call(this, body);
};

await import('./server-old.js');
