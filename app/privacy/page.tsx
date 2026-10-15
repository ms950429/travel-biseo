import Link from 'next/link';

export default function Privacy() {
  return (
    <main className="prose">
      <Link href="/login">← 돌아가기</Link>
      <h1 style={{ fontSize: 22 }}>개인정보 처리방침</h1>
      <p>임시 문구예요. 정식 처리방침이 준비되면 이 페이지의 내용을 교체해 주세요.</p>
      <h2>저장하는 정보</h2>
      <p>Google 계정 식별자와 사용자가 입력한 여행·항목 정보만 저장해요. 탈퇴하면 모두 삭제돼요.</p>
    </main>
  );
}
