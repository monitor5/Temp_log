# Temp_log theme

`temp-log`는 개인 블로그를 위해 새로 작성한 Ghost 6용 한국어 테마입니다. 원본 포트폴리오의 코드, 이미지, 글꼴, 로고를 포함하지 않습니다. 별도의 JavaScript 번들, 빌드 단계, 분석 추적기를 사용하지 않습니다. 기본 글꼴은 시스템 폰트이며 Ghost의 제목·본문 글꼴 설정도 지원합니다. 관리자가 별도 글꼴을 선택하면 Ghost가 해당 폰트를 제공할 수 있습니다.

Ghost 관리자에서 사이트 제목·설명, 내비게이션, 글·페이지·태그·작성자 정보를 설정하면 테마에 반영됩니다. 메뉴가 모바일 화면에서도 그대로 표시되므로 짧은 메뉴 이름 3–5개를 권장합니다. 사이트 언어는 `ko`로 설정하세요. 읽기 시간은 Ghost가 계산한 추정값입니다.

표지 이미지와 대체 텍스트는 글 설정에서 지정합니다. 이미지가 없는 글은 텍스트 카드로 표시되며, 태그·작성자별 목록과 페이지 이동, RSS 링크가 제공됩니다. 일반 페이지의 제목·표지 표시 여부도 편집기 설정을 따릅니다. Ghost 편집기의 이미지·갤러리·북마크·파일·영상 카드와 일반/넓게/전체 너비를 지원합니다. 카드 동작에 필요한 공식 CSS·JavaScript는 `ghost_head`가 제공합니다.

웹 관리자 기능은 Ghost 자체에서 제공합니다. 이 테마는 회원 가입, 결제, 구독, 댓글 버튼을 추가하지 않습니다. 회원 기능과 Portal 노출 여부는 Ghost 관리자 설정에서 별도로 제어하세요. 작성자가 본문에 추가한 외부 임베드나 관리자 코드 삽입은 별도의 외부 요청을 만들 수 있습니다.

업로드용 ZIP의 최상단에 `package.json`, `default.hbs`, `index.hbs`, `post.hbs`, `assets/`, `partials/`가 위치해야 합니다. 프로젝트의 테마 패키징 절차를 사용한 뒤 Ghost 관리자 **Settings → Design & branding → Change theme → Upload theme**에서 설치하고 활성화합니다.

공식 참조: [테마 구조](https://docs.ghost.org/themes/structure/), [편집기 카드](https://docs.ghost.org/themes/content/), [읽기 시간](https://ghost.org/docs/themes/helpers/reading_time/).

Copyright © 2026 monitor5. All rights reserved. 이 디렉터리의 새 코드에는 `UNLICENSED`가 적용되며, Ghost와 외부 구성 요소의 라이선스는 각각 유지됩니다.
