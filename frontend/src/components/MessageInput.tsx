import { useState, useRef, KeyboardEvent, ClipboardEvent } from 'react';

const MAX_LENGTH = 2000;
const WARN_THRESHOLD = 1800;

interface Props {
  onSend: (text: string) => void;
  disabled: boolean;
}

export default function MessageInput({ onSend, disabled }: Props) {
  const [value, setValue] = useState('');
  const [pasteWarning, setPasteWarning] = useState(false);
  const [wasTruncated, setWasTruncated] = useState(false);
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isEmpty = !value || !value.trim();

  const handleSend = () => {
    if (isEmpty) return;
    if (disabled) return;
    onSend(value.trim());
    setValue('');
    setWasTruncated(false);
    setPasteWarning(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (isEmpty) return;
      handleSend();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    const pasted = e.clipboardData.getData('text');
    if (pasted.length > MAX_LENGTH) {
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      setPasteWarning(true);
      setWasTruncated(true);
      warningTimerRef.current = setTimeout(() => setPasteWarning(false), 4000);
    }
  };

  const remaining = MAX_LENGTH - value.length;
  const showCounter = value.length >= WARN_THRESHOLD;

  return (
    <div className="flex flex-col border-t border-gray-100 bg-white">
      {pasteWarning && (
        <p className="text-xs text-amber-600 px-4 pt-2 pb-0">
          Your message was over 2000 characters and has been shortened to 2000. Please review before sending.
        </p>
      )}
      {showCounter && (
        <p className={`text-right text-xs px-4 pt-1 ${remaining <= 0 ? 'text-red-500' : 'text-gray-400'}`}>
          {remaining} remaining
        </p>
      )}
      <div className="flex items-end gap-2 px-4 py-3">
        <textarea
          className={`flex-1 resize-none text-sm text-gray-800 placeholder-gray-400 outline-none max-h-28 leading-relaxed rounded
            ${wasTruncated ? 'ring-1 ring-amber-400' : ''}`}
          rows={1}
          placeholder="Type a message…"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (wasTruncated && e.target.value.length < MAX_LENGTH) setWasTruncated(false);
          }}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          disabled={disabled}
          maxLength={MAX_LENGTH}
        />
        <button
          onClick={handleSend}
          disabled={isEmpty || disabled}
          className="shrink-0 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-full w-8 h-8 flex items-center justify-center transition-colors"
          aria-label="Send"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 2L11 13" />
            <path d="M22 2L15 22 11 13 2 9l20-7z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
