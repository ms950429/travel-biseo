'use client';
import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { TripForm } from '@/components/TripForm';
import { useStore } from '@/lib/store';
import { isPastTrip } from '@/lib/logic';

export default function EditTrip() {
  const { id } = useParams<{ id: string }>();
  const store = useStore();
  const router = useRouter();
  const trip = store.trips.find((t) => t.id === id);
  const readOnly = trip ? isPastTrip(trip, store.today) : false;
  useEffect(() => {
    if (!trip || readOnly) router.replace('/'); // 지난 여행은 읽기 전용
  }, [trip, readOnly, router]);
  if (!trip || readOnly) return <div className="center">불러오는 중…</div>;
  return <TripForm key={trip.id} trip={trip} />;
}
