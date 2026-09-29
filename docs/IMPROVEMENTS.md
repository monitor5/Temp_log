# 다른 블로그/CMS에서 참고한 개선 방식

서비스를 교체하거나 타 프로젝트 코드를 복제하지 않고, 원본 앱의 결함과 맞닿는 설계만 적용했다.

| 참고 | 적용한 원칙 | 원본 앱 변경 |
| --- | --- | --- |
| [Payload의 초안·읽기 권한](https://payloadcms.com/docs/versions/drafts) | 공개 상태와 편집 권한은 서버가 결정 | 새 글은 숨김 기본값, anonymous includeHidden 거부, ID/slug·댓글에서도 초안 차단 |
| [Payload의 업로드](https://payloadcms.com/docs/upload/overview) | 파일 크기 제한, 이미지 처리, 형식·저장 정책 | Multer 최신판, magic bytes 검사, Sharp 재인코딩, UUID 이름, 전체 할당량 |
| [Strapi의 인증·권한 설명](https://strapi.io/blog/authentication-and-authorization) | 브라우저에 읽히지 않는 인증 쿠키와 서버 측 검증 | HttpOnly/SameSite 세션, Origin·요청 헤더 확인, 사용자 존재 확인, logout/암호 변경 시 폐기 |
| [Express 공식 세션 지침](https://expressjs.com/en/resources/middleware/session/) | 운영에서 메모리 세션 저장소를 사용하지 않음 | connect-mongo로 세션 지속, Secure 쿠키 및 trust proxy를 실제 경로에 맞춰 설정 |

버전 이력, 자동 저장, 예약 발행, 이메일 뉴스레터, 외부 OAuth, 테마 마켓은 이번 수정에 추가하지 않았다. 원본 기능을 안정화한 뒤 필요가 확인되면 각각 작은 변경으로 검토할 항목이다.

참고 자료의 기능을 그대로 구현했다고 주장하지 않는다. 예를 들어 Payload의 버전별 초안 이력은 구현하지 않았고, 원래 `isHidden` 필드의 접근 제어를 바로잡았다. 업로드 파일의 악성코드 검사나 비밀 파일 권한 모델도 별도 기능이다.
