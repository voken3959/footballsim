import type { CareerSave, Email, Player } from './types';
import { RNG } from './rng';
import { addDays } from './dates';

export function generateEmails(save: CareerSave, user: Player, rng: RNG): Email[] {
  const newEmails: Email[] = [];
  const today = save.currentDate;

  // Limit to 1 email every 5 days maximum
  const lastEmail = save.emails[save.emails.length - 1];
  if (lastEmail && today < addDays(lastEmail.date, 5)) {
    return [];
  }

  // Get user's recent stats
  const seasonStats = user.seasonStats.find(s => s.season === save.currentSeason);
  const avgRating = seasonStats?.averageRating ?? 0;
  const apps = seasonStats?.appearances ?? 0;

  // 1. Manager Warning (Rare, requires poor form)
  if (avgRating > 0 && avgRating < 6.0 && apps >= 3 && rng.chance(0.3)) {
    newEmails.push({
      id: `mail_${Date.now()}_1`,
      date: today,
      sender: `Manager (${save.clubs.find(c => c.id === user.clubId)?.managerName})`,
      subject: 'Need to see more from you',
      body: `I've been reviewing your recent performances. Your average rating is currently ${avgRating.toFixed(2)}, which isn't good enough for this club. \n\nI need to see a reaction in training and on the pitch, otherwise I'll be forced to look at loan options or drop you from the squad.`,
      read: false,
      type: 'Manager',
    });
    return newEmails;
  }

  // 2. Manager Praise (Rare, requires great form)
  if (avgRating > 7.5 && apps >= 4 && rng.chance(0.2)) {
    newEmails.push({
      id: `mail_${Date.now()}_2`,
      date: today,
      sender: `Manager (${save.clubs.find(c => c.id === user.clubId)?.managerName})`,
      subject: 'Keep up the fantastic work',
      body: `Just wanted to drop you a quick message to say I'm delighted with your performances lately. Your average rating of ${avgRating.toFixed(2)} is outstanding.\n\nKeep your head down and keep working hard. Big things ahead.`,
      read: false,
      type: 'Manager',
    });
    return newEmails;
  }

  // 3. Agent Message (Medium rarity, requires good form)
  if (avgRating > 6.8 && apps >= 5 && rng.chance(0.25)) {
    newEmails.push({
      id: `mail_${Date.now()}_3`,
      date: today,
      sender: 'Your Agent',
      subject: 'Scouts are watching',
      body: `Hey. I've had a few people in the game asking about you. Your recent performances haven't gone unnoticed.\n\nKeep doing what you're doing. If you keep this form up, I might be able to get you a move to a bigger club in the next window.`,
      read: false,
      type: 'Agent',
    });
    return newEmails;
  }

  // 4. Playing Time / Loan offer (If young and not playing)
  if (user.age <= 22 && user.contract.squadRole === 'Academy' || user.contract.squadRole === 'Fringe') {
    if (rng.chance(0.15)) {
      newEmails.push({
        id: `mail_${Date.now()}_4`,
        date: today,
        sender: 'Your Agent',
        subject: 'Loan Opportunity',
        body: `You're not getting enough first-team minutes here. I've spoken to a club in a lower division who are interested in taking you on loan for the rest of the season to get you playing regularly.\n\nLet me know if you want me to explore this.`,
        read: false,
        type: 'Transfer',
      });
    }
  }

  return newEmails;
}
