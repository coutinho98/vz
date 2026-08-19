import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

const HOLD_KEY = (eventId: string, seatId: string) =>
  `seat:hold:${eventId}:${seatId}`;

// trava todos os assentos juntos; se 1 falhar, não trava nenhum (all-or-nothing)
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

  // tenta lock de todos os assentos no redis
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

  // limpa locks do redis
  async release(eventId: string, seatIds: string[]): Promise<void> {
    const redis = this.redisService.redis;
    if (!redis || seatIds.length === 0) return;

    await redis.del(...seatIds.map((id) => HOLD_KEY(eventId, id)));
  }

  // retorna quais assentos estão com lock ativo no redis
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

  // pega o eventId da chave seat:hold:{eventId}:{seatId}
  static eventIdFromKey(key: string): string | null {
    const parts = key.split(':');
    if (parts.length !== 4 || parts[0] !== 'seat' || parts[1] !== 'hold') {
      return null;
    }
    return parts[2];
  }
}
