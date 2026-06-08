import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';

// Each StatusPills instance gets its own unique channel name to avoid the
// "cannot add postgres_changes callbacks after subscribe()" error that fires
// when multiple cards for the same order are mounted simultaneously (e.g.
// multi-card replies) or when React Strict Mode double-invokes effects.
function uniqueChannelId(orderNumber: string) {
  return `order-${orderNumber}-${crypto.randomUUID()}`;
}

const STATUSES = ['Paid', 'Packed', 'Shipped', 'Delivered'] as const;
type Status = typeof STATUSES[number];

const dotColor: Record<Status, string> = {
  Paid:      'bg-yellow-400',
  Packed:    'bg-orange-400',
  Shipped:   'bg-blue-500',
  Delivered: 'bg-green-500',
};

const barColor: Record<Status, string> = {
  Paid:      'bg-yellow-400',
  Packed:    'bg-orange-400',
  Shipped:   'bg-blue-500',
  Delivered: 'bg-green-500',
};

interface Props {
  orderNumber: string;
  initialStatus: string;
}

export default function StatusPills({ orderNumber, initialStatus }: Props) {
  const [status, setStatus] = useState<Status>(initialStatus as Status);
  const [reconnecting, setReconnecting] = useState(false);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const channelId = useRef(uniqueChannelId(orderNumber));

  useEffect(() => {
    const channel = supabase
      .channel(channelId.current)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `order_number=eq.${orderNumber}`,
        },
        (payload) => {
          const newStatus = (payload.new as { status?: string }).status;
          if (newStatus && STATUSES.includes(newStatus as Status)) {
            setStatus(newStatus as Status);
          }
        }
      )
      .on('system', { event: '*' }, (payload: { status?: string }) => {
        const s = payload.status;
        if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT' || s === 'CLOSED') {
          setReconnecting(true);
          reconnectTimer.current = setTimeout(() => {
            channel.subscribe();
          }, 5000);
        } else if (s === 'SUBSCRIBED') {
          setReconnecting(false);
          if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
        }
      })
      .subscribe();

    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      supabase.removeChannel(channel);
    };
  }, [orderNumber]);

  const currentIdx = STATUSES.indexOf(status);
  const activeBar = barColor[status];

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <span className={`w-2 h-2 rounded-full shrink-0 ${dotColor[status]}`} />
        <span className="text-xs font-semibold text-gray-700">{status}</span>
      </div>
      <div className="flex gap-0.5">
        {STATUSES.map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors duration-300
              ${i <= currentIdx ? activeBar : 'bg-gray-200'}`}
          />
        ))}
      </div>
      {reconnecting && (
        <span className="text-[10px] text-gray-400 animate-pulse">Reconnecting…</span>
      )}
    </div>
  );
}
