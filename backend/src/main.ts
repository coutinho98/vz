import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

// seed de demonstração opcional: nunca pode derrubar ou atrasar o boot
// (no render free o wake-up precisa ser rápido; falha de seed é log, não crash)
async function seedOnStartup() {
  const { execFile } = await import('node:child_process');
  const { promisify } = await import('node:util');
  const exec = promisify(execFile);
  await exec('npx', ['tsx', 'prisma/seed.ts'], {
    cwd: process.cwd(),
    timeout: 60_000,
  });
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  app.enableCors();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  await app.listen(process.env.PORT ?? 3000);

  // só depois de responder requisições; e engolido — boot é sagrado
  if (process.env.SEED_ON_STARTUP === 'true') {
    seedOnStartup().catch((err) =>
      console.warn('[seed] ignorado:', err.message),
    );
  }
}
bootstrap();
