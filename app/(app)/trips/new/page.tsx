'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TripForm } from '@/components/TripForm';
import { useStore } from '@/lib/store';
import { usePopup } from '@/components/Popup';
import { MAX_ACTIVE_TRIPS, isActiveTrip } from '@/lib/logic';
import { MSG } from '@/lib/messages';

export default function NewTrip() {
  const store = useStore();
  const popup = usePopup();
  const router = useRouter();
  // 화면에 들어올 때 한 번만 판단한다. (여행을 저장한 뒤 3개가 되어도 안내 팝업이 뜨면 안 된다)
  const [full] = useState(() => store.trips.filter((t) => isActiveTrip(t, store.today)).length >= MAX_ACTIVE_TRIPS);
  useEffect(() => {
    // 진행 중인 여행이 3개이면 이 화면으로 들어오지 않는다. (주소를 직접 열어도 마찬가지)
    if (full) {
      popup.alert(MSG.tripLimit, () => router.replace('/'));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [full]);
  if (full) return <div className="center">불러오는 중…</div>;
  return <TripForm />;
}
