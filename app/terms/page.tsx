import Link from 'next/link';

export default function Terms() {
  return (
    <main className="prose">
      <Link href="/login">← 돌아가기</Link>
      <h1 style={{ fontSize: 22 }}>이용약관</h1>
      <p>임시 문구예요. 정식 이용약관이 준비되면 이 페이지의 내용을 교체해 주세요.</p>
      <h2>서비스 소개</h2>
      <p>여행비서는 여행 정보에 맞춰 준비 사항을 정리하고, 기한에 맞춰 알려주는 체크리스트 서비스예요.</p>
    </main>
  );
}
