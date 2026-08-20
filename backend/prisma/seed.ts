import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import * as bcrypt from 'bcryptjs';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const TMDB_KEY = process.env.TMDB_API_KEY;
const TMDB_IMG = 'https://image.tmdb.org/t/p/w500';

/** Busca o pôster no TMDB; sem chave/resultado devolve null (placeholder do front). */
async function poster(query: string): Promise<string | null> {
  if (!TMDB_KEY) return null;
  try {
    const url = `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_KEY}&language=pt-BR&query=${encodeURIComponent(query)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const data = (await res.json()) as { results: { poster_path: string | null }[] };
    const path = data.results[0]?.poster_path;
    return path ? `${TMDB_IMG}${path}` : null;
  } catch {
    return null;
  }
}

function daysFromNow(days: number, hour = 21) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, 0, 0, 0);
  return date;
}

async function main() {
  try {
    await prisma.$executeRawUnsafe(
      `UPDATE "Event" SET "title" = REPLACE("title", '—', '-') WHERE "title" LIKE '%—%'`,
    );
  } catch {}

  const eventCount = await prisma.event.count();
  if (eventCount > 0) {
    console.log(`Banco de dados já contém ${eventCount} eventos. Pulando seed.`);
    return;
  }

  const [organizer, customer, customer2, gate] = await Promise.all([
    prisma.user.upsert({
      where: { email: 'marina@vz.com' },
      update: {},
      create: {
        name: 'Marina Promoções',
        email: 'marina@vz.com',
        passwordHash: await bcrypt.hash('123456', 10),
        role: 'ORGANIZER',
      },
    }),
    prisma.user.upsert({
      where: { email: 'maria@vz.com' },
      update: {},
      create: {
        name: 'Maria Plateia',
        email: 'maria@vz.com',
        passwordHash: await bcrypt.hash('123456', 10),
        role: 'CUSTOMER',
      },
    }),
    prisma.user.upsert({
      where: { email: 'joao@vz.com' },
      update: {},
      create: {
        name: 'João Camarote',
        email: 'joao@vz.com',
        passwordHash: await bcrypt.hash('123456', 10),
        role: 'CUSTOMER',
      },
    }),
    prisma.user.upsert({
      where: { email: 'paulo@vz.com' },
      update: {},
      create: {
        name: 'Paulo Portaria',
        email: 'paulo@vz.com',
        passwordHash: await bcrypt.hash('123456', 10),
        role: 'GATE',
      },
    }),
  ]);
  void gate;
  void customer2;

  const seats = (rows: number, perRow: number) => {
    const data: { row: string; number: number }[] = [];
    for (let r = 0; r < rows; r++) {
      for (let n = 1; n <= perRow; n++) {
        data.push({ row: String.fromCharCode(65 + r), number: n });
      }
    }
    return { create: data };
  };

  const eventsData = [
    {
      organizerId: organizer.id,
      category: 'MOVIE',
      catalogRef: 'movie-duna2',
      title: 'Duna: Parte Dois',
      description:
        'Exibição especial em tela grande com som remasterizado. Paul Atreides se une aos Fremen para vingar sua casa e tentar impedir um futuro terrível.',
      venue: 'Cine Art Luz',
      room: 'Sala 1',
      city: 'São Paulo',
      startsAt: daysFromNow(7, 20),
      seatingMode: 'SEATED' as const,
      rowsCount: 6,
      seatsPerRow: 10,
      priceCents: 4500,
      status: 'PUBLISHED',
      posterUrl: await poster('Duna: Parte Dois'),
    },
    {
      organizerId: organizer.id,
      category: 'SHOW',
      catalogRef: 'show-coldplay',
      title: 'Coldplay - Music of the Spheres',
      description:
        'Palco imersivo, pulseiras luminosas e os maiores hits da banda em uma produção hipnótica.',
      venue: 'Allianz Parque',
      room: 'Pista & Cadeira Inferior',
      city: 'São Paulo',
      startsAt: daysFromNow(14, 21),
      seatingMode: 'SEATED' as const,
      rowsCount: 8,
      seatsPerRow: 12,
      priceCents: 15000,
      status: 'PUBLISHED',
    },
    {
      organizerId: organizer.id,
      category: 'SHOW',
      catalogRef: 'show-ludmilla',
      title: 'Ludmilla - Numanice Tour',
      description:
        'A rainha do funk em turnê pelos maiores estádios do país, com produção grandiosa e hits que dominaram as paradas.',
      venue: 'Estádio Nilton Santos',
      room: 'Pista Premium',
      city: 'Rio de Janeiro',
      startsAt: daysFromNow(21, 20),
      seatingMode: 'STANDING' as const,
      capacity: 500,
      priceCents: 8000,
      status: 'PUBLISHED',
    },
    {
      organizerId: organizer.id,
      category: 'MOVIE',
      catalogRef: 'movie-interstellar',
      title: 'Interstellar - Sessão Vibe',
      description:
        'Clássico da ficção científica em exibição comentada com trilha ao vivo de sintetizadores.',
      venue: 'Cine Vila Lobos',
      room: 'Sala 3 IMAX',
      city: 'São Paulo',
      startsAt: daysFromNow(10, 19),
      seatingMode: 'SEATED' as const,
      rowsCount: 5,
      seatsPerRow: 8,
      priceCents: 3900,
      status: 'PUBLISHED',
      posterUrl: await poster('Interstellar'),
    },
    {
      organizerId: organizer.id,
      category: 'SHOW',
      catalogRef: 'show-gil',
      title: 'Gilberto Gil - Acústico',
      description:
        'O mestre da música brasileira em um show intimista: voz, violão e a história da MPB.',
      venue: 'Theatro Municipal',
      room: 'Plateia Nobre',
      city: 'Belo Horizonte',
      startsAt: daysFromNow(30, 19),
      seatingMode: 'SEATED' as const,
      rowsCount: 10,
      seatsPerRow: 14,
      priceCents: 12000,
      status: 'PUBLISHED',
    },
    {
      organizerId: organizer.id,
      category: 'SHOW',
      catalogRef: 'show-dj-avenue',
      title: 'Alok - Festival Avenue',
      description: 'Set especial de 3 horas com convidados surpresa e o melhor do eletrônico mundial.',
      venue: 'Autódromo de Interlagos',
      room: 'Arena Principal',
      city: 'São Paulo',
      startsAt: daysFromNow(45, 22),
      seatingMode: 'STANDING' as const,
      capacity: 1000,
      priceCents: 9900,
      status: 'DRAFT',
    },
  ];

  for (const data of eventsData) {
    await prisma.event.create({
      data: {
        ...data,
        ...(data.seatingMode === 'SEATED'
          ? { seats: seats(data.rowsCount!, data.seatsPerRow!) }
          : {}),
      },
    });
  }

  // reserva + pagamento + ingresso de exemplo para o cliente demo
  const event = await prisma.event.findFirstOrThrow({
    where: { title: { startsWith: 'Duna' }, status: 'PUBLISHED' },
    include: { seats: true },
  });
  const chosen = event.seats.filter((s) => s.row === 'C' && s.number <= 2).map((s) => s.id);

  const reservation = await prisma.reservation.create({
    data: {
      userId: customer.id,
      eventId: event.id,
      quantity: chosen.length,
      totalCents: event.priceCents * chosen.length,
      status: 'CONFIRMED',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    },
  });
  await prisma.seat.updateMany({
    where: { id: { in: chosen } },
    data: { reservationId: reservation.id },
  });
  await prisma.payment.create({
    data: {
      reservationId: reservation.id,
      status: 'APPROVED',
      cardBrand: 'Visa',
      cardLast4: '1111',
      amountCents: reservation.totalCents,
    },
  });
  const seatsTaken = await prisma.seat.findMany({ where: { id: { in: chosen } } });
  await prisma.ticket.createMany({
    data: seatsTaken.map((seat, i) => ({
      code: `ING-DEM0${i + 1}-AA0${i + 1}`,
      reservationId: reservation.id,
      eventId: event.id,
      userId: customer.id,
      seatId: seat.id,
      seatLabel: `${seat.row}${seat.number}`,
      quantity: 1,
    })),
  });

  console.log('Seed concluído: 4 usuários, 6 eventos, 1 ingresso demo');
  console.log('  marina@vz.com (ORGANIZER)   / 123456');
  console.log('  maria@vz.com  (CUSTOMER)    / 123456');
  console.log('  joao@vz.com   (CUSTOMER)    / 123456');
  console.log('  paulo@vz.com  (GATE)        / 123456');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
