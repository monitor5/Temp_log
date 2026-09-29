import { Link } from 'react-router-dom';

export function About() {
  return (
    <section className="container-narrow py-12 lg:py-20">
      <div className="max-w-2xl mx-auto">
        <h1 className="font-serif text-display-sm lg:text-display mb-6">블로그 소개</h1>
        <p className="text-body-lg leading-relaxed text-secondary">
          Temp-Log는 일상과 생각, 좋아하는 것들을 가볍게 기록하는 공간입니다.
        </p>
        <Link to="/gallery" className="btn-ghost mt-8">전체 글 보기</Link>
      </div>
    </section>
  );
}
