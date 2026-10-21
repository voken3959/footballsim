import type { CareerSave, Email, Player } from './types';
import { RNG } from './rng';
import { addDays } from './dates';

export function generateEmails(save: CareerSave, user: Player, rng: RNG): Email[] {
  const newEmails: Email[] = [];
  const today = save.currentDate;

  // Emails should be rare. Minimum 14 days between any emails.
  const lastEmail = save.emails[save.emails.length - 1];
  if (lastEmail && today < addDays(lastEmail.date, 14)) {
    return [];
  }

  // Get user's recent stats
  const seasonStats = user.seasonStats.find(s => s.season === save.currentSeason);
  const avgRating = seasonStats?.averageRating ?? 0;
  const apps = seasonStats?.appearances ?? 0;
  const club = save.clubs.find(c => c.id === user.clubId);

  // 1. Manager Warning (Rare, requires poor form, 10% chance)
  if (avgRating > 0 && avgRating < 6.2 && apps >= 5 && rng.chance(0.10)) {
    newEmails.push({
      id: `mail_${Date.now()}_1`,
      date: today,
      sender: `Manager (${club?.managerName})`,
      subject: 'Need to see more from you',
      body: `I've been reviewing your recent performances. Your average rating is currently ${avgRating.toFixed(2)}, which isn't good enough for this club. \n\nI need to see a reaction in training and on the pitch, otherwise I'll be forced to drop you from the squad and look at other options.`,
      read: false,
      type: 'Manager',
    });
    return newEmails;
  }

  // 2. Manager Praise (Rare, requires great form, 10% chance)
  if (avgRating > 7.2 && apps >= 5 && rng.chance(0.10)) {
    newEmails.push({
      id: `mail_${Date.now()}_2`,
      date: today,
      sender: `Manager (${club?.managerName})`,
      subject: 'Keep up the fantastic work',
      body: `Just wanted to drop you a quick message to say I'm delighted with your performances lately. Your average rating of ${avgRating.toFixed(2)} is outstanding.\n\nKeep your head down and keep working hard.`,
      read: false,
      type: 'Manager',
    });
    return newEmails;
  }

  // 3. Agent Message (Very Rare, 5% chance, no promises of transfers yet)
  if (apps >= 5 && rng.chance(0.05)) {
    newEmails.push({
      id: `mail_${Date.now()}_3`,
      date: today,
      sender: 'Your Agent',
      subject: 'Checking in',
      body: `Hey. Just wanted to check in and see how you're settling in. The stats look decent so far.\n\nKeep doing what you're doing. I'm keeping an eye on things and will let you know if any concrete opportunities arise in the future.`,
      read: false,
      type: 'Agent',
    });
    return newEmails;
  }

  return newEmails;
}
