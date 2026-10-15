# 여행비서 (모바일 웹 MVP)

여행 정보(국가·일정)에 맞춰 준비 사항을 자동으로 만들고, 기한(D-Day)에 맞춰 알려주는 체크리스트 서비스입니다.
기능명세서 F-00~F-05, 스토리보드 S-00~S-05, 디자인 가이드를 그대로 구현했습니다.

- **기술**: Next.js 14 (App Router) · React 18 · TypeScript · Supabase (Auth + Postgres)
- **기준 화면**: 갤럭시 S26 (360×780). PC에서도 폭 430px 이하의 모바일 화면을 가운데 정렬해서 보여줍니다.

## 1. 바로 실행해 보기 (Supabase 없이)

```bash
npm install
npm run dev        # http://localhost:3000
```

이 버전은 **체험판**이에요. 로그인 화면의 **"체험하기"** 버튼을 누르면 데모 모드로 들어가서 모든 기능을 써 볼 수 있어요.

### 데모 모드 들어가기
로그인 화면에서 **"체험하기" 버튼**을 누르세요. (예전에 쓰던 "로고 8번 클릭"은 없어졌어요.)

- 데이터는 **이 브라우저의 localStorage에만** 저장됩니다. 서버로 아무것도 보내지 않아요.
- 로그아웃해도 데이터는 남고, 탈퇴하면 데모 데이터가 모두 지워집니다.
- 시연용으로 **"오늘 날짜"를 바꿔 볼 수 있어요.** 홈 화면 오른쪽 위, "알림 설정" 바로 왼쪽의 **"날짜설정(Test)" 버튼**을 누르면 날짜 설정 창이 열려요.
  - 달력에서 날짜를 고르고 **적용**을 누르면 그 날짜가 "오늘"이 돼요. (새로고침 없이 바로 바뀝니다)
  - **오늘로 되돌리기**를 누르면 실제 오늘 날짜로 돌아가요.
  - D-Day 배지, 기한 지남, 알림 문구, 홈 카드의 칩, 구간 이동, 출발일 다음 날부터 "지난 여행"으로 이동하는 것을 확인할 때 편해요.
  - **데모 모드(체험판)에서만** 보여요. 정식 서비스(Google 로그인) 모드에서는 이 버튼이 나타나지 않아요.
  - 설정은 그 브라우저에만 저장돼요. (개발자 도구 콘솔에서 `localStorage.setItem('tb_today','2026-10-27')`로도 바꿀 수 있어요)

## 2. Supabase + Google 로그인 연결하기 (정식 서비스로 전환할 때)

> 현재는 체험판이라 로그인 화면에 Google 로그인 버튼이 없습니다. Google 로그인 코드(`lib/auth.tsx`의 `signInGoogle`)와 DB 설정은 그대로 남아 있어요.
> 정식 서비스로 전환할 때는 아래 설정을 마친 뒤, `app/login/page.tsx`의 "체험하기" 버튼 옆에(또는 대신) `auth.signInGoogle()`을 부르는 "Google로 시작하기" 버튼을 다시 연결하면 됩니다.

1. **Supabase 프로젝트 만들기** → Project Settings > API에서 `Project URL`과 `anon public key`를 복사해 둡니다.
2. **DB 만들기**: SQL Editor에서 `supabase/migrations/001_init.sql` 전체를 붙여넣고 실행합니다.
   (테이블 4개, 본인 데이터만 보이는 보안 규칙, 진행 중 여행 3개 제한, 탈퇴 함수가 만들어져요.)
3. **Google OAuth 클라이언트 만들기**: Google Cloud Console > API 및 서비스 > 사용자 인증 정보 > OAuth 클라이언트 ID(웹 애플리케이션)
   - 승인된 리디렉션 URI: `https://<프로젝트ID>.supabase.co/auth/v1/callback`
4. **Supabase에 Google 켜기**: Authentication > Providers > Google에 클라이언트 ID/Secret 입력 후 활성화.
5. **주소 등록**: Authentication > URL Configuration
   - Site URL: 배포 주소 (예: `https://여행비서주소.vercel.app`)
   - Redirect URLs: 배포 주소와 `http://localhost:3000` 추가
6. **환경 변수 넣기**: `.env.example`을 `.env.local`로 복사해 두 값을 채웁니다. (Vercel에서는 아래 3번)

연결이 끝나고 위처럼 버튼을 다시 연결하면 "Google로 시작하기"가 실제로 동작합니다. 처음 로그인하면 자동으로 가입돼요.
**꼭 직접 한 번 눌러서 확인해 주세요.** 이 개발 환경에서는 실제 Google 로그인을 시험할 수 없었습니다.

## 3. Vercel 배포

이미 제출한 Vercel 주소를 그대로 쓰려면, **같은 GitHub 저장소**의 내용을 이 폴더로 교체하세요. (같은 프로젝트면 주소가 유지됩니다.)

1. 저장소의 기존 `index.html`을 지우고, 이 폴더의 파일을 모두 올립니다. (`node_modules`, `.next`는 올리지 않아요)
2. Vercel 프로젝트 > Settings > General > **Framework Preset을 Next.js**로 바꿉니다. (Build/Output 설정은 비워 두세요)
3. Settings > Environment Variables에 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`를 넣고 다시 배포(Redeploy)합니다.
   - Supabase를 아직 연결하지 않았다면 이 단계는 건너뛰어도 됩니다. 데모 모드로 접속할 수 있어요.

## 4. 테스트

```bash
npm test             # 업무 규칙 단위 테스트 26개 (구간, 기한, 정렬, 알림, 진행률, 지난 여행 경계 등)
npm run typecheck
```

브라우저 자동 테스트(데모 모드, 105개 확인 항목)는 `e2e/smoke_demo.py`입니다. (Python + Playwright 필요)
```bash
npm run build && npm start -- -p 3100   # 다른 터미널에서
pip install playwright && playwright install chromium
python e2e/smoke_demo.py
```

## 5. 코드 위치 (명세서 대응)

| 내용 | 파일 |
| --- | --- |
| 구간, 기한, 정렬, 배지, 진행률, 알림, 이름 자동 생성, 날짜 검증 | `lib/logic.ts` |
| 준비 항목 목록 (일본 20개) | `lib/templates.ts` ← `travel_biseo_prep_items_japan_draft.xlsx`와 같아야 합니다 |
| 고정 문구 (팝업·오류·알림) | `lib/messages.ts` |
| 데이터 저장소 (데모 / Supabase) | `lib/repo/demo.ts`, `lib/repo/supabase.ts` |
| 로그인 상태, 데모 모드, 탈퇴 | `lib/auth.tsx` |
| 화면 | `app/login`, `app/(app)/page.tsx`(홈), `trips/new`, `trips/[id]`, `trips/[id]/edit`, `trips/[id]/items/*`, `settings/alerts` |
| 디자인 토큰 | `app/globals.css` (디자인 가이드의 CSS 변수와 동일) |

준비 항목을 바꾸려면 `lib/templates.ts`를 고치세요. 이미 만들어진 체크리스트에는 영향이 없습니다(복사본을 쓰기 때문).

## 6. 알아두실 점 (명세서에 없어서 정한 것)

- 도시 목록은 일본 10곳(도쿄, 오사카, 교토, 후쿠오카, 삿포로, 나고야, 요코하마, 고베, 히로시마, 오키나와)으로 정했어요. `lib/templates.ts`에서 바꿀 수 있어요.
- 출발일을 오늘 이전 날짜로 직접 입력하면 "출발일은 오늘 이후 날짜만 선택할 수 있어요." 오류를 보여줘요.
- 상단 알림은 홈과 체크리스트 화면에만 보여요. (스토리보드 기준)
- 진행 중인 여행 3개 제한은 서버(SQL 트리거)에서도 막아요. 서버 기준 날짜는 한국 시간입니다.
- 이용약관·개인정보 처리방침 페이지(`/terms`, `/privacy`)는 임시 문구입니다. 정식 문구로 교체해 주세요.
- 체험판에서는 데이터가 브라우저에만 저장돼요. 다른 기기나 브라우저에서는 보이지 않고, 브라우저 데이터를 지우면 사라집니다.
- 이벤트 로그(명세서 10장)는 Supabase `events` 테이블(데모 모드에서는 localStorage)에 쌓입니다. 분석 도구는 따로 연결하지 않았어요.
- 글꼴(Noto Sans KR)은 Google Fonts에서 불러옵니다.
