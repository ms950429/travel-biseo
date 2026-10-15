'use client';
import { useState } from 'react';
import { useStore } from '@/lib/store';
import { isValidDate } from '@/lib/dates';

/**
 * 데모 모드 전용: "오늘" 날짜를 바꿔서 D-Day, 기한 지남, 알림, 지난 여행 이동 등을 시연할 수 있다.
 * 홈 화면의 로고를 2초 이내 간격으로 8번 연속 누르면 열린다.
 */
export function DemoDateDialog({ onClose }: { onClose: () => void }) {
  const store = useStore();
  const [value, setValue] = useState(store.today);
  const ok = isValidDate(value);

  return (
    <div className="scrim" role="dialog" aria-modal="true" data-testid="demo-date">
      <div className="dlg">
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 17, fontWeight: 700 }}>시연용 날짜 설정</div>
          <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 6, lineHeight: 1.5 }}>
            고른 날짜를 오늘로 취급해요. 데모 모드에서만 보여요.
          </div>
        </div>
        <input
          type="date"
          className="inp"
          aria-label="기준 날짜"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          data-testid="demo-date-input"
        />
        <div className="btns three">
          <button className="btn btn-secondary" onClick={onClose}>닫기</button>
          <button
            className="btn btn-secondary"
            onClick={() => {
              store.setDemoToday(null); // 실제 오늘 날짜로 되돌린다
              onClose();
            }}
            data-testid="demo-date-reset"
          >
            오늘로 되돌리기
          </button>
          <button
            className="btn btn-primary"
            disabled={!ok}
            onClick={() => {
              store.setDemoToday(value);
              onClose();
            }}
            data-testid="demo-date-apply"
          >
            적용
          </button>
        </div>
      </div>
    </div>
  );
}
