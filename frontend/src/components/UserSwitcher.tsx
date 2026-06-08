import { useRef, useState, useEffect } from 'react';
import { CUSTOMERS } from '../data/customers';
import { useCustomerStore } from '../stores/customerStore';
import { useChatStore } from '../stores/chatStore';

export default function UserSwitcher() {
  const { customer, setCustomer } = useCustomerStore();
  const { switchCustomer } = useChatStore();
  const [open, setOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; right: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const handleToggle = () => {
    if (!open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    }
    setOpen((o) => !o);
  };

  const handleSwitch = (id: string) => {
    const next = CUSTOMERS.find((c) => c.id === id);
    if (!next || next.id === customer.id) { setOpen(false); return; }
    setCustomer(next);
    switchCustomer(next.id); // load new customer's sessions from per-customer storage
    setOpen(false);
  };

  const firstName = customer.name.split(' ')[0];

  return (
    <div className="relative shrink-0">
      <button
        ref={triggerRef}
        onClick={handleToggle}
        className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition-colors text-xs"
        title="Switch customer"
      >
        <span
          className="w-4 h-4 rounded-full flex items-center justify-center text-white text-[9px] font-bold shrink-0"
          style={{ backgroundColor: customer.color }}
        >
          {customer.initials[0]}
        </span>
        <span className="font-medium">{firstName}</span>
        <svg
          className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && dropdownPos && (
        <div
          ref={dropdownRef}
          className="fixed w-52 bg-white rounded-xl border border-gray-100 shadow-xl py-1 z-[200]"
          style={{ top: dropdownPos.top, right: dropdownPos.right }}
        >
          <p className="px-3 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
            Browse as
          </p>
          {CUSTOMERS.map((c) => (
            <button
              key={c.id}
              onClick={() => handleSwitch(c.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-gray-50 transition-colors
                ${c.id === customer.id ? 'bg-gray-50' : ''}`}
            >
              <span
                className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0"
                style={{ backgroundColor: c.color }}
              >
                {c.initials}
              </span>
              <div className="min-w-0">
                <p className={`text-sm font-medium truncate ${c.id === customer.id ? 'text-gray-900' : 'text-gray-700'}`}>
                  {c.name}
                </p>
                <p className="text-xs text-gray-400">{c.city}</p>
              </div>
              {c.id === customer.id && (
                <svg className="w-3.5 h-3.5 text-gray-900 ml-auto shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
