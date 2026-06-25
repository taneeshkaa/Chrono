import { auth } from '@/auth';
import { getUpcomingEvents } from '@/lib/calendar';
import { NextResponse } from 'next/server';

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const events = await getUpcomingEvents(session.user.id);
    return NextResponse.json(events.map(event => ({
      title: event.title,
      date: event.date.toISOString(),
      time: event.time,
    })));
  } catch (err) {
    console.error('FAILED TO FETCH CALENDAR EVENTS:', err);
    return NextResponse.json([], { status: 200 });
  }
}
