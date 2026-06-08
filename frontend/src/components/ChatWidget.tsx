import { useEffect } from 'react';
import { useChatStore } from '../stores/chatStore';
import ChatHeader from './ChatHeader';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import SessionSwitcher from './SessionSwitcher';

interface Props {
  onClose?: () => void;
  className?: string;
}

export default function ChatWidget({ onClose, className = '' }: Props) {
  const {
    messages, isLoading, error, showSessionPanel,
    send, newSession, clearError, toggleSessionPanel, initStore,
  } = useChatStore();

  useEffect(() => { initStore(); }, [initStore]);

  return (
    <div
      className={`flex flex-col bg-white overflow-hidden border border-gray-200
        shadow-[0_24px_64px_-8px_rgba(0,0,0,0.18)]
        w-full h-full sm:w-[440px] sm:h-[680px] sm:max-h-[85vh] sm:rounded-2xl ${className}`}
    >
      <ChatHeader
        showingSessions={showSessionPanel}
        onToggleSessions={toggleSessionPanel}
        onNewSession={newSession}
        onClose={onClose}
      />

      {showSessionPanel ? (
        <SessionSwitcher />
      ) : (
        <>
          <MessageList messages={messages} isLoading={isLoading} />
          {error && (
            <div className="flex items-start gap-2 px-4 py-2 bg-red-50 border-t border-red-100 shrink-0">
              <p className="flex-1 text-xs text-red-600">{error}</p>
              <button
                onClick={clearError}
                className="text-red-400 hover:text-red-600 text-xs shrink-0"
                aria-label="Dismiss error"
              >
                ✕
              </button>
            </div>
          )}
          <MessageInput onSend={send} disabled={isLoading} />
        </>
      )}
    </div>
  );
}
