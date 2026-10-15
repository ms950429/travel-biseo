/* eslint-disable @next/next/no-img-element */
/** 체크마크 캐릭터. 로그인 화면과 준비 완료 안내에서만 쓴다. */
export function Character({ width }: { width: number }) {
  return <img src="/character.png" width={width} height={Math.round((width * 369) / 300)} alt="체크마크 캐릭터" style={{ display: 'block' }} />;
}
