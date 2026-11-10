'use client';
import { useParams } from 'next/navigation';
import { MarketDetail } from '@/components/MarketDetail';

export default function MarketPage() {
  const { id } = useParams<{ id: string }>();
  return <MarketDetail id={id} />;
}
