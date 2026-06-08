import UserSwitcher from './UserSwitcher';

interface Props {
  showingSessions: boolean;
  onToggleSessions: () => void;
  onNewSession: () => void;
  onClose?: () => void;
}

export default function ChatHeader({
  showingSessions,
  onToggleSessions,
  onNewSession,
  onClose,
}: Props) {
  return (
    <div className="flex items-center justify-between px-4 py-3 bg-gray-900 text-white shrink-0">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-sm font-bold border border-white/20 shrink-0">
          M
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-tight">Marqet</p>
          <p className="text-xs text-gray-400 truncate">Marqet Customer Support</p>
        </div>
      </div>

      <div className="flex items-center gap-0.5 shrink-0">
        <UserSwitcher />

        <button
          onClick={onNewSession}
          className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="New conversation"
          title="New conversation"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>

        <button
          onClick={onToggleSessions}
          className={`p-1.5 rounded-lg transition-colors
            ${showingSessions ? 'text-white bg-white/15' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
          aria-label="Session history"
          title="Session history"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
          </svg>
        </button>

        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close"
            title="Close"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
