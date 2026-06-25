const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { getUpcomingEvents } = require('./src/lib/calendar');

async function main() {
  try {
    const events = await getUpcomingEvents('cmqti86m40000hrog5gibqskg');
    const mapped = events.map(event => ({
      title: event.title,
      date: event.date.toISOString(),
      time: event.time,
    }));
    console.log('MAPPED EVENTS:', JSON.stringify(mapped, null, 2));
  } catch (err) {
    console.error('Error fetching:', err);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
