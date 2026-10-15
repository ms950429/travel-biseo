import { LOGO_PATHS, LOGO_RATIO, LOGO_VIEWBOX } from '@/lib/logo';

/** 제출한 프로젝트명 이미지를 벡터로 다시 그린 로고. 글자로 다시 쓰지 않는다. */
export function Logo({ width, className }: { width: number; className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={LOGO_VIEWBOX}
      width={width}
      height={Math.round(width / LOGO_RATIO)}
      role="img"
      aria-label="여행비서"
      className={className}
      style={{ display: 'block' }}
      dangerouslySetInnerHTML={{ __html: LOGO_PATHS }}
    />
  );
}
