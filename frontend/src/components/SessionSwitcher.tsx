import { useChatStore } from '../stores/chatStore';

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function SessionSwitcher() {
  const { sessions, sessionId, newSession, switchSession, deleteSession } = useChatStore();

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm('Delete this conversation? This cannot be undone.')) {
      deleteSession(id);
    }
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-white">
      <div className="px-4 py-3 border-b border-gray-100">
        <button
          onClick={newSession}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium transition-colors"
        >
          <span className="text-base leading-none">+</span>
          New Conversation
        </button>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
        {sessions.length === 0 ? (
          <p className="text-center text-xs text-gray-400 py-8">No past conversations yet.</p>
        ) : (
          sessions.map((s) => {
            const active = s.id === sessionId;
            return (
              <div
                key={s.id}
                className={`flex items-center gap-2 hover:bg-gray-50 transition-colors
                  ${active ? 'bg-blue-50 border-l-2 border-gray-900' : ''}`}
              >
                <button
                  onClick={() => switchSession(s.id)}
                  className="flex-1 text-left px-4 py-3 min-w-0"
                >
                  <p className={`text-sm truncate ${active ? 'text-gray-900 font-medium' : 'text-gray-700'}`}>
                    {s.firstMessage || 'New conversation'}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{relativeTime(s.updatedAt)}</p>
                </button>
                <button
                  onClick={(e) => handleDelete(e, s.id)}
                  className="shrink-0 mr-3 p-1 rounded text-gray-300 hover:text-red-400 transition-colors"
                  aria-label="Delete conversation"
                  title="Delete"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
