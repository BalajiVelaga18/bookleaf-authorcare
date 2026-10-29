import { sseClients } from '../controllers/sseController.js';

export function broadcastToAuthor(authorId, event, payload) {
  const clients = sseClients.get(authorId) || [];
  const dead = [];
  clients.forEach((client) => {
    try {
      client.res.write(`event: ${event}\n`);
      client.res.write(`data: ${JSON.stringify(payload)}\n\n`);
    } catch (err) {
      dead.push(client);
    }
  });
  if (dead.length) {
    const remaining = clients.filter((c) => !dead.includes(c));
    if (remaining.length) sseClients.set(authorId, remaining);
    else sseClients.delete(authorId);
  }
}

export function broadcastToAdmins(event, payload) {
  const clients = sseClients.get('admin') || [];
  const dead = [];
  clients.forEach((client) => {
    try {
      client.res.write(`event: ${event}\n`);
      client.res.write(`data: ${JSON.stringify(payload)}\n\n`);
    } catch (err) {
      dead.push(client);
    }
  });
  if (dead.length) {
    const remaining = clients.filter((c) => !dead.includes(c));
    if (remaining.length) sseClients.set('admin', remaining);
    else sseClients.delete('admin');
  }
}
