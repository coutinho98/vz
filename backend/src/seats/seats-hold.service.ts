import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

const HOLD_KEY = (eventId: string, seatId: string) =>
  `seat:hold:${eventId}:${seatId}`;

/**
 * Ou segura TODOS os assentos, ou nenhum (all-or-nothing).
 * KEYS = chaves dos assentos · ARGV[1] = reservationId · ARGV[2] = ttl segundos
 */
const HOLD_LUA = `
for i = 1, #KEYS do
  if redis.call('EXISTS', KEYS[i]) == 1 then return 0 end
end
for i = 1, #KEYS do
  redis.call('SET', KEYS[i], ARGV[1], 'EX', ARGV[2])
end
return 1
`;

@Injectable()
export class SeatsHoldService {
  private readonly logger = new Logger(SeatsHoldService.name);

  constructor(private redisService: RedisService) {}

  /**
   * Tenta conquistar o lock efêmero de todos os assentos de uma vez.
   * Retorna false se algum já estiver segurado. No-op sem Redis.
   */
  async hold(
    eventId: string,
    seatIds: string[],
    reservationId: string,
    ttlSeconds: number,
  ): Promise<boolean> {
    const redis = this.redisService.redis;
    if (!redis || seatIds.length === 0) return true;

    const keys = seatIds.map((id) => HOLD_KEY(eventId, id));
    const result = (await redis.eval(
      HOLD_LUA,
      keys.length,
      ...keys,
      reservationId,
      String(ttlSeconds),
    )) as number;
    return result === 1;
  }

  /** Libera os locks (pagamento confirmado, cancelamento ou compensação). No-op sem Redis. */
  async release(eventId: string, seatIds: string[]): Promise<void> {
    const redis = this.redisService.redis;
    if (!redis || seatIds.length === 0) return;

    await redis.del(...seatIds.map((id) => HOLD_KEY(eventId, id)));
  }

  /** IDs dos assentos segurados no Redis entre os informados. */
  async heldSeatIds(eventId: string, seatIds: string[]): Promise<Set<string>> {
    const redis = this.redisService.redis;
    if (!redis || seatIds.length === 0) return new Set();

    const pipeline = redis.pipeline();
    for (const id of seatIds) pipeline.exists(HOLD_KEY(eventId, id));
    const results = await pipeline.exec();
    const held = new Set<string>();
    results?.forEach(([err, exists], i) => {
      if (err) this.logger.warn(`redis exists: ${err.message}`);
      else if (exists === 1) held.add(seatIds[i]);
    });
    return held;
  }

  /** Extrai o eventId de uma chave seat:hold:{eventId}:{seatId} expirada. */
  static eventIdFromKey(key: string): string | null {
    const parts = key.split(':');
    if (parts.length !== 4 || parts[0] !== 'seat' || parts[1] !== 'hold') {
      return null;
    }
    return parts[2];
  }
}
