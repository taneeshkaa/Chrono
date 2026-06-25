import { prisma } from './prisma';
import { CommitmentStatus } from '@prisma/client';
import { logger } from './logger';

export type NotificationItem = {
  id: string;
  title: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  type: 'DEADLINE' | 'RISK' | 'MISSED' | 'SUMMARY';
  createdAt: string;
};

type DailySummary = {
  title: string;
  description: string;
};

export async function generateDailySummary(userId: string): Promise<DailySummary> {
  const now = new Date();
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);
  const endOfWeek = new Date(now);
  endOfWeek.setDate(now.getDate() + 7);

  const commitments = await prisma.commitment.findMany({
    where: {
      userId,
      status: { notIn: [CommitmentStatus.COMPLETED, CommitmentStatus.ARCHIVED] }
    }
  });

  const activeCommitments = commitments.filter(c => c.status === CommitmentStatus.ACTIVE).length;
  const deadlinesToday = commitments.filter(c => c.deadline && c.deadline >= now && c.deadline <= endOfToday).length;
  const deadlinesThisWeek = commitments.filter(c => c.deadline && c.deadline >= now && c.deadline <= endOfWeek).length;
  const missedCommitments = commitments.filter(c => c.status === CommitmentStatus.MISSED).length;

  const summaryDescription = `You have ${activeCommitments} active commitments, ${deadlinesToday} deadline(s) today, ${deadlinesThisWeek} deadline(s) this week, and ${missedCommitments} missed commitment(s).`;
  
  const summary: DailySummary = {
    title: "Today's Summary",
    description: summaryDescription
  };

  return summary;
}

export async function generateNotifications(userId: string): Promise<NotificationItem[]> {
  const now = new Date();
  const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);

  const commitments = await prisma.commitment.findMany({
    where: {
      userId,
      status: { notIn: [CommitmentStatus.COMPLETED, CommitmentStatus.ARCHIVED] }
    }
  });

  const notifications: NotificationItem[] = [];

  for (const commitment of commitments) {
    if (commitment.deadline) {
      if (commitment.deadline > now && commitment.deadline <= twentyFourHoursFromNow) {
        notifications.push({
          id: `${commitment.id}-24h`,
          title: 'Deadline Tomorrow',
          description: `${commitment.title} is due tomorrow.`,
          priority: 'HIGH',
          type: 'DEADLINE',
          createdAt: now.toISOString()
        });
      }

      if (commitment.deadline > twentyFourHoursFromNow && commitment.deadline <= threeDaysFromNow) {
        notifications.push({
          id: `${commitment.id}-3d`,
          title: 'Deadline Coming Up',
          description: `${commitment.title} is due in 3 days.`,
          priority: 'MEDIUM',
          type: 'DEADLINE',
          createdAt: now.toISOString()
        });
      }
    }

    if (commitment.riskScore >= 75) {
      notifications.push({
        id: `${commitment.id}-risk`,
        title: 'High Risk Commitment',
        description: `${commitment.title} has risk score ${commitment.riskScore}.`,
        priority: 'HIGH',
        type: 'RISK',
        createdAt: now.toISOString()
      });
    }

    if (commitment.status === CommitmentStatus.MISSED) {
      notifications.push({
        id: `${commitment.id}-missed`,
        title: 'Missed Commitment',
        description: `You missed ${commitment.title}.`,
        priority: 'HIGH',
        type: 'MISSED',
        createdAt: now.toISOString()
      });
    }

    if (commitment.status === CommitmentStatus.DISCOVERED && commitment.createdAt < fiveDaysAgo) {
      const daysSince = Math.floor((now.getTime() - commitment.createdAt.getTime()) / (1000 * 60 * 60 * 24));
      notifications.push({
        id: `${commitment.id}-ignored`,
        title: 'Ignored Commitment',
        description: `You have ignored ${commitment.title} for ${daysSince} days.`,
        priority: 'MEDIUM',
        type: 'RISK',
        createdAt: now.toISOString()
      });
    }
  }

  notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return notifications;
}
