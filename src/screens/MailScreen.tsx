import { useState } from 'react';
import { useCareerStore } from '../store/careerStore';
import { formatDate } from '../game/dates';
import type { Email } from '../game/types';

export default function MailScreen() {
  const save = useCareerStore((s) => s.save)!;
  const markEmailRead = useCareerStore((s) => s.markEmailRead);
  const markAllEmailsRead = useCareerStore((s) => s.markAllEmailsRead);
  
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);

  // Sort newest first
  const emails = [...save.emails].reverse();
  const unreadCount = emails.filter((e) => !e.read).length;

  const handleEmailClick = (email: Email) => {
    setSelectedEmail(email);
    if (!email.read) {
      markEmailRead(email.id);
    }
  };

  if (selectedEmail) {
    return (
      <div className="space-y-4">
        <button 
          className="text-sm text-txt-muted hover:text-txt flex items-center gap-2"
          onClick={() => setSelectedEmail(null)}
        >
          ← Back to Inbox
        </button>
        
        <div className="panel p-4 md:p-6">
          <div className="flex items-start justify-between border-b border-bg-border pb-4 mb-4">
            <div>
              <h2 className="text-lg font-bold text-txt">{selectedEmail.subject}</h2>
              <div className="text-sm text-txt-muted mt-1">From: {selectedEmail.sender}</div>
            </div>
            <div className="text-xs text-txt-dim">{formatDate(selectedEmail.date)}</div>
          </div>
          <div className="text-sm text-txt whitespace-pre-wrap leading-relaxed">
            {selectedEmail.body}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="label text-accent-soft">Inbox</div>
          <h1 className="text-xl font-bold mt-1">Mail</h1>
        </div>
        {unreadCount > 0 && (
          <button className="btn text-xs py-1.5" onClick={markAllEmailsRead}>
            Mark all as read
          </button>
        )}
      </div>

      <div className="panel overflow-hidden">
        {emails.length === 0 ? (
          <div className="p-8 text-center text-txt-muted text-sm">
            Your inbox is empty.
          </div>
        ) : (
          emails.map((email) => (
            <button
              key={email.id}
              onClick={() => handleEmailClick(email)}
              className={`w-full text-left px-4 py-3 border-b border-bg-border last:border-b-0 transition-colors hover:bg-bg-card ${
                !email.read ? 'bg-accent/5' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {!email.read && <span className="w-2 h-2 rounded-full bg-accent shrink-0" />}
                    <span className={`text-sm truncate ${!email.read ? 'font-bold text-txt' : 'font-medium text-txt-muted'}`}>
                      {email.sender}
                    </span>
                  </div>
                  <div className={`text-sm mt-0.5 truncate ${!email.read ? 'text-txt' : 'text-txt-muted'}`}>
                    {email.subject}
                  </div>
                </div>
                <div className="text-xs text-txt-dim shrink-0">
                  {formatDate(email.date)}
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
