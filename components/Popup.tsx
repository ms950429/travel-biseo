'use client';
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

export type PopupBtn = { label: string; kind?: 'primary' | 'secondary' | 'danger'; onClick?: () => void | Promise<void> };
type State = { message: string; buttons: PopupBtn[] } | null;
type Api = {
  open: (message: string, buttons: PopupBtn[]) => void;
  /** 버튼 하나("확인")짜리 안내 팝업 */
  alert: (message: string, onOk?: () => void | Promise<void>) => void;
  /** 취소·확인 팝업 */
  confirm: (message: string, onOk: () => void | Promise<void>) => void;
  close: () => void;
};
const Ctx = createContext<Api | null>(null);

export function PopupProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(null);
  const busy = useRef(false);
  const close = useCallback(() => setState(null), []);
  const open = useCallback((message: string, buttons: PopupBtn[]) => setState({ message, buttons }), []);
  const alert = useCallback(
    (message: string, onOk?: () => void | Promise<void>) => open(message, [{ label: '확인', kind: 'primary', onClick: onOk }]),
    [open],
  );
  const confirm = useCallback(
    (message: string, onOk: () => void | Promise<void>) =>
      open(message, [
        { label: '취소', kind: 'secondary' },
        { label: '확인', kind: 'primary', onClick: onOk },
      ]),
    [open],
  );

  const click = async (b: PopupBtn) => {
    if (busy.current) return; // 같은 버튼을 두 번 눌러도 한 번만 처리
    busy.current = true;
    setState(null);
    try {
      await b.onClick?.();
    } finally {
      busy.current = false;
    }
  };

  return (
    <Ctx.Provider value={{ open, alert, confirm, close }}>
      {children}
      {state && (
        <div className="scrim" role="dialog" aria-modal="true" data-testid="popup">
          <div className="dlg">
            <p>{state.message}</p>
            <div className={'btns' + (state.buttons.length === 3 ? ' three' : '')}>
              {state.buttons.map((b) => (
                <button
                  key={b.label}
                  className={'btn ' + (b.kind === 'danger' ? 'btn-danger' : b.kind === 'secondary' ? 'btn-secondary' : 'btn-primary')}
                  onClick={() => click(b)}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}

export function usePopup(): Api {
  const v = useContext(Ctx);
  if (!v) throw new Error('PopupProvider missing');
  return v;
}
