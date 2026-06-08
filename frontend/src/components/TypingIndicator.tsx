export default function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 px-4 py-2 self-start">
      <div className="flex items-center gap-1 bg-gray-100 rounded-2xl rounded-bl-none px-3 py-2">
        <span className="text-xs text-gray-500 mr-1">Agent is typing…</span>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  );
}
