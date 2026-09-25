import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { NextFunction, Request, Response } from 'express';

@Injectable()
export class ObservabilityMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const startedAt = Date.now();
    const incoming = req.header('x-request-id')?.trim();
    const requestId = incoming?.slice(0, 120) || randomUUID();
    res.setHeader('x-request-id', requestId);
    res.on('finish', () => {
      if (req.path.startsWith('/health/')) return;
      const entry = {
        level: res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info',
        event: 'http_request',
        requestId,
        method: req.method,
        path: req.originalUrl.split('?')[0],
        statusCode: res.statusCode,
        durationMs: Date.now() - startedAt,
        timestamp: new Date().toISOString(),
      };
      const serialized = JSON.stringify(entry);
      if (res.statusCode >= 500) console.error(serialized);
      else if (res.statusCode >= 400) console.warn(serialized);
      else console.log(serialized);
    });
    next();
  }
}
