/** Mounts POST /api/ai-design on the Vite dev and preview servers (see server/aiDesign.ts). */
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';
import { handleDesignRequest, RequestError, type Env } from './aiDesign';

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.setEncoding('utf8');
    req.on('data', (chunk: string) => {
      body += chunk;
      if (body.length > 20_000) reject(new RequestError(413, 'Yêu cầu quá dài.'));
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

function send(res: ServerResponse, status: number, payload: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

function handler(getEnv: () => Env) {
  return async (req: IncomingMessage, res: ServerResponse) => {
    if (req.method !== 'POST') {
      send(res, 405, { error: 'Chỉ hỗ trợ POST.' });
      return;
    }
    let body: string;
    try {
      body = await readBody(req);
    } catch (error) {
      send(res, error instanceof RequestError ? error.status : 400, { error: error instanceof Error ? error.message : 'Yêu cầu không hợp lệ.' });
      return;
    }
    const { status, payload } = await handleDesignRequest(getEnv(), body);
    send(res, status, payload);
  };
}

/** Vite plugin mounting the endpoint on both `vite` (dev) and `vite preview`. */
export function aiDesignPlugin(getEnv: () => Env): Plugin {
  return {
    name: 'viet-phuc-ai-design',
    configureServer(server) {
      server.middlewares.use('/api/ai-design', handler(getEnv));
    },
    configurePreviewServer(server) {
      server.middlewares.use('/api/ai-design', handler(getEnv));
    },
  };
}
