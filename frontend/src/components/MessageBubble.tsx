import ReactMarkdown from 'react-markdown';
import type { Message } from '../types';
import OrderCard from './OrderCard';
import { useChatStore } from '../stores/chatStore';

interface Props {
  message: Message;
}

export default function MessageBubble({ message }: Props) {
  const retry = useChatStore((s) => s.retry);
  const isUser = message.sender === 'user';

  const cards =
    message.card_payloads && message.card_payloads.length > 0
      ? message.card_payloads
      : message.card_payload
      ? [message.card_payload]
      : [];

  return (
    <div className={`flex flex-col gap-1.5 ${isUser ? 'items-end' : 'items-start'} px-4`}>
      {cards.map((c) => (
        <OrderCard key={c.order_number} card={c} />
      ))}
      <div
        className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed break-words
          ${isUser
            ? 'bg-gray-900 text-white rounded-br-sm'
            : 'bg-gray-100 text-gray-800 rounded-bl-sm'
          }
          ${message.status === 'failed' ? 'opacity-50' : ''}`}
      >
        {isUser ? (
          message.text
        ) : (
          <ReactMarkdown
            components={{
              // Links disabled — no URLs should surface in AI replies
              a: ({ children }) => <span>{children}</span>,
              p: ({ children }) => <p className="m-0">{children}</p>,
              ul: ({ children }) => <ul className="list-disc pl-5 my-1">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal pl-5 my-1">{children}</ol>,
            }}
          >
            {message.text}
          </ReactMarkdown>
        )}
      </div>
      {message.status === 'failed' && (
        <div className="flex items-center gap-2 max-w-[78%]">
          <p className="text-xs text-red-400">{message.errorMessage ?? 'Failed to send.'}</p>
          <button
            onClick={() => retry(message.id, message.text)}
            className="text-xs text-gray-500 hover:text-gray-800 flex items-center gap-0.5 shrink-0"
          >
            ↺ Retry
          </button>
        </div>
      )}
    </div>
  );
}
