import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Subject } from 'rxjs';
import Redis from 'ioredis';

/**
 * Conexão Redis opcional: sem REDIS_URL o sistema opera em modo
 * somente-Postgres (locks condicionais já garantem a anti-venda-dupla).
 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private subscriber: Redis | null = null;

  /** emite a chave completa de cada evento de expiração (notify-keyspace-events Ex) */
  readonly keyExpired$ = new Subject<string>();

  get enabled() {
    return this.client !== null;
  }

  get redis() {
    return this.client;
  }

  async onModuleInit() {
    const url = process.env.REDIS_URL;
    if (!url) {
      this.logger.log('REDIS_URL ausente — modo somente-Postgres');
      return;
    }

    this.client = new Redis(url, {
      retryStrategy: (times) => Math.min(times * 200, 2000),
    });
    this.client.on('error', (err) =>
      this.logger.warn(`redis: ${err.message}`),
    );
    await new Promise<void>((resolve) => {
      this.client!.on('ready', () => resolve());
    });

    try {
      // notificações de chave expirada (necessário p/ liberar holds vencidos)
      await this.client.config('SET', 'notify-keyspace-events', 'Ex');
    } catch {
      this.logger.warn(
        'redis: não foi possível ativar notify-keyspace-events (expiração não será propagada)',
      );
    }

    this.subscriber = this.client.duplicate();
    await this.subscriber.psubscribe('__keyevent*__:expired');
    this.subscriber.on('pmessage', (_pattern, _channel, key) => {
      this.keyExpired$.next(key);
    });

    this.logger.log('redis conectado — holds de assentos ativos');
  }

  async onModuleDestroy() {
    await this.client?.quit();
    await this.subscriber?.quit();
  }
}
