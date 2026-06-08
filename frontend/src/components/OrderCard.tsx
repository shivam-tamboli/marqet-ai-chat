import type { CardPayload } from '../types';
import StatusPills from './StatusPills';

interface Props {
  card: CardPayload;
}

export default function OrderCard({ card }: Props) {
  return (
    <div className="w-full max-w-[75%] bg-white rounded-xl shadow-sm border border-gray-100 p-3 text-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold text-gray-700">{card.order_number}</span>
        <a
          href={`${window.location.origin}/#order-${card.order_number}`}
          className="text-blue-600 text-xs hover:underline"
        >
          Track Order
        </a>
      </div>
      <p className="text-gray-500 text-xs mb-2">{card.customer_name}</p>
      <StatusPills orderNumber={card.order_number} initialStatus={card.status} />
    </div>
  );
}
