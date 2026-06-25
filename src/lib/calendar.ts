import { prisma } from './prisma';
import { Commitment } from '@prisma/client';
import { logger } from './logger';
import { retry } from './retry';

const CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3/calendars/primary';

async function calendarFetch<T>(url: string, accessToken: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`Calendar API request failed: ${response.status} ${await response.text()}`);
  }

  return response.json() as Promise<T>;
}

async function getRefreshedAccessToken(connection: {
  id: string;
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: Date | null;
}): Promise<string> {
  if (!connection.accessToken) throw new Error('No access token');

  const isExpired =
    !connection.expiresAt ||
    connection.expiresAt.getTime() - 5 * 60 * 1000 < Date.now();

  if (!isExpired) return connection.accessToken;

  if (!connection.refreshToken) {
    throw new Error('No refresh token');
  }

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: 'refresh_token',
      refresh_token: connection.refreshToken,
    }),
  });

  if (!res.ok) throw new Error(`Token refresh failed: ${await res.text()}`);

  const tokens = await res.json();

  await prisma.connection.update({
    where: { id: connection.id },
    data: {
      accessToken: tokens.access_token,
      expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
    },
  });

  return tokens.access_token;
}

export async function getUpcomingEvents(
  userId: string,
  maxResults: number = 5,
): Promise<Array<{ title: string; date: Date; time: string }>> {
  const connections = await prisma.connection.findMany({
    where: {
      userId,
      provider: 'gmail',
      connected: true,
    },
  });

  if (connections.length === 0) {
    return [];
  }

  const connection = connections[0];
  const accessToken = await getRefreshedAccessToken(connection);

  const now = new Date().toISOString();
  const query = new URLSearchParams({
    timeMin: now,
    maxResults: maxResults.toString(),
    singleEvents: 'true',
    orderBy: 'startTime',
  });

  const listResponse = await calendarFetch<{
    items?: Array<{
      summary?: string;
      start?: { dateTime?: string; date?: string };
      end?: { dateTime?: string; date?: string };
    }>;
  }>(`${CALENDAR_API_BASE}/events?${query.toString()}`, accessToken);

  const events = listResponse.items ?? [];

  return events.map((event) => {
    const start = event.start?.dateTime
      ? new Date(event.start.dateTime)
      : event.start?.date
        ? new Date(event.start.date)
        : new Date();

    const timeString = event.start?.dateTime
      ? start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : 'All day';

    return {
      title: event.summary ?? 'Untitled Event',
      date: start,
      time: timeString,
    };
  });
}

export async function createCalendarEvent(
  userId: string,
  commitment: Commitment,
): Promise<string> {
  const connections = await prisma.connection.findMany({
    where: {
      userId,
      provider: 'gmail',
      connected: true,
    },
  });

  if (connections.length === 0) {
    throw new Error('No connected Google accounts');
  }

  if (!commitment.deadline) {
    throw new Error('Commitment has no deadline');
  }

  const connection = connections[0];
  const accessToken = await getRefreshedAccessToken(connection);

  const event = {
    summary: `[ChronoAI] ${commitment.title}`,
    description: `Title: ${commitment.title}\nCategory: ${commitment.category}\nPriority: ${commitment.priority}\nRisk Score: ${commitment.riskScore}`,
    start: {
      dateTime: commitment.deadline.toISOString(),
      timeZone: 'UTC',
    },
    end: {
      dateTime: new Date(commitment.deadline.getTime() + 60 * 60 * 1000).toISOString(),
      timeZone: 'UTC',
    },
  };

  const response = await retry(
    () =>
      calendarFetch<{ id: string }>(
        `${CALENDAR_API_BASE}/events`,
        accessToken,
        { method: 'POST', body: JSON.stringify(event) },
      ),
    { retries: 3, delay: 1000 },
  );

  return response.id;
}

export async function updateCalendarEvent(
  userId: string,
  commitment: Commitment,
): Promise<string> {
  if (!commitment.calendarEventId) {
    throw new Error('Commitment has no calendar event id');
  }

  const connections = await prisma.connection.findMany({
    where: {
      userId,
      provider: 'gmail',
      connected: true,
    },
  });

  if (connections.length === 0) {
    throw new Error('No connected Google accounts');
  }

  if (!commitment.deadline) {
    throw new Error('Commitment has no deadline');
  }

  const connection = connections[0];
  const accessToken = await getRefreshedAccessToken(connection);

  const event = {
    summary: `[ChronoAI] ${commitment.title}`,
    description: `Title: ${commitment.title}\nCategory: ${commitment.category}\nPriority: ${commitment.priority}\nRisk Score: ${commitment.riskScore}`,
    start: {
      dateTime: commitment.deadline.toISOString(),
      timeZone: 'UTC',
    },
    end: {
      dateTime: new Date(commitment.deadline.getTime() + 60 * 60 * 1000).toISOString(),
      timeZone: 'UTC',
    },
  };

  const response = await retry(
    () =>
      calendarFetch<{ id: string }>(
        `${CALENDAR_API_BASE}/events/${commitment.calendarEventId}`,
        accessToken,
        { method: 'PUT', body: JSON.stringify(event) },
      ),
    { retries: 3, delay: 1000 },
  );

  return response.id;
}

export async function deleteCalendarEvent(
  userId: string,
  calendarEventId: string,
): Promise<void> {
  const connections = await prisma.connection.findMany({
    where: {
      userId,
      provider: 'gmail',
      connected: true,
    },
  });

  if (connections.length === 0) {
    return;
  }

  const connection = connections[0];
  const accessToken = await getRefreshedAccessToken(connection);

  await retry(
    () =>
      calendarFetch(
        `${CALENDAR_API_BASE}/events/${calendarEventId}`,
        accessToken,
        { method: 'DELETE' },
      ),
    { retries: 3, delay: 1000 },
  );
}
