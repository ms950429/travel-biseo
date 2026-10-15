// Prepare-item list (Japan). Source of truth: travel_biseo_prep_items_japan_draft.xlsx
export type Template = {
  id: string;
  title: string;
  offsetDays: 30 | 14 | 7 | 1;
  country: 'ALL' | 'JP';
  minDays?: number; // trip length condition (none yet)
  maxDays?: number;
};

export const TEMPLATES: Template[] = [
  { id: 'T-01', title: '여권 유효기간 확인', offsetDays: 30, country: 'ALL' },
  { id: 'T-02', title: '항공권 예약 확인', offsetDays: 30, country: 'ALL' },
  { id: 'T-03', title: '숙소 예약 확인', offsetDays: 30, country: 'ALL' },
  { id: 'T-04', title: '보험 가입하기', offsetDays: 30, country: 'ALL' },
  { id: 'T-05', title: '입국 관련 절차 확인', offsetDays: 14, country: 'JP' },
  { id: 'T-06', title: '교통 패스 예약하기', offsetDays: 14, country: 'ALL' },
  { id: 'T-07', title: '입장권 예약하기', offsetDays: 14, country: 'ALL' },
  { id: 'T-08', title: 'eSIM 구매하기', offsetDays: 14, country: 'ALL' },
  { id: 'T-09', title: '환전하기', offsetDays: 7, country: 'ALL' },
  { id: 'T-10', title: '해외결제 카드 준비하기', offsetDays: 7, country: 'ALL' },
  { id: 'T-11', title: '날씨 확인하기', offsetDays: 7, country: 'ALL' },
  { id: 'T-12', title: '현지 주의사항 확인하기', offsetDays: 7, country: 'ALL' },
  { id: 'T-13', title: '식당·체험 예약하기', offsetDays: 7, country: 'ALL' },
  { id: 'T-14', title: '의류 챙기기', offsetDays: 1, country: 'ALL' },
  { id: 'T-15', title: '세면도구 챙기기', offsetDays: 1, country: 'ALL' },
  { id: 'T-16', title: '충전기·보조배터리 챙기기', offsetDays: 1, country: 'ALL' },
  { id: 'T-17', title: '상비약 챙기기', offsetDays: 1, country: 'ALL' },
  { id: 'T-18', title: '여권 지참 확인', offsetDays: 1, country: 'ALL' },
  { id: 'T-19', title: '항공권 정보 확인', offsetDays: 1, country: 'ALL' },
  { id: 'T-20', title: '숙소 정보 확인', offsetDays: 1, country: 'ALL' },
];

export const CITIES_JP = ['도쿄', '오사카', '교토', '후쿠오카', '삿포로', '나고야', '요코하마', '고베', '히로시마', '오키나와'];
export const COUNTRY_NAME: Record<'JP', string> = { JP: '일본' };
