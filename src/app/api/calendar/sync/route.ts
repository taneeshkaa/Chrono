import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { createCalendarEvent, updateCalendarEvent } from '@/lib/calendar';
import { rateLimit } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { NextResponse } from 'next/server';

export async function POST() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Rate limit
  const identifier = session.user.id
  const rateLimitResult = await rateLimit('calendar-sync', identifier)
  if (!rateLimitResult.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  let eventsCreated = 0;
  let eventsUpdated = 0;

  const commitments = await prisma.commitment.findMany({
    where: {
      userId: session.user.id,
      status: 'ACTIVE',
      deadline: { not: null },
    },
  });

  for (const commitment of commitments) {
    try {
      if (!commitment.calendarEventId) {
        const eventId = await createCalendarEvent(session.user.id, commitment);
        await prisma.commitment.update({
          where: { id: commitment.id },
          data: { calendarEventId: eventId, calendarSynced: true },
        });
        eventsCreated++;
      } else {
        await updateCalendarEvent(session.user.id, commitment);
        eventsUpdated++;
      }
    } catch (err) {
      logger.error('FAILED TO SYNC COMMITMENT', { commitmentId: commitment.id, error: err })
    }
  }

  logger.info('CALENDAR SYNC COMPLETE', { eventsCreated, eventsUpdated });

  return NextResponse.json({ eventsCreated, eventsUpdated });
}
