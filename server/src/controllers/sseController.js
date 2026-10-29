import { verifyToken } from '../utils/tokenService.js';

export const sseClients = new Map();

export function handleSSE(req, res) {
  const token = req.query.token || req.cookies?.token;
  if (!token) {
    res.status(401).json({ success: false, message: 'Authentication required' });
    return;
  }

  let decoded;
  try {
    decoded = verifyToken(token);
  } catch (err) {
    res.status(401).json({ success: false, message: 'Invalid token' });
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  const key = decoded.role === 'admin' ? 'admin' : decoded.userId;
  const client = { res, userId: decoded.userId, role: decoded.role };
  if (!sseClients.has(key)) sseClients.set(key, []);
  sseClients.get(key).push(client);

  res.write(`event: connected\ndata: ${JSON.stringify({ userId: decoded.userId, role: decoded.role })}\n\n`);

  const heartbeat = setInterval(() => {
    try {
      res.write(':heartbeat\n\n');
    } catch (err) {
      cleanup();
    }
  }, 30000);

  const cleanup = () => {
    clearInterval(heartbeat);
    const clients = sseClients.get(key) || [];
    const remaining = clients.filter((c) => c.res !== res);
    if (remaining.length) sseClients.set(key, remaining);
    else sseClients.delete(key);
  };

  req.on('close', cleanup);
  req.on('error', cleanup);
}
