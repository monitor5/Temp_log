# 라이선스 및 출처 검토

검토일: 2026-09-29. 참고 저장소: [monitor5/sspark_portpolio](https://github.com/monitor5/sspark_portpolio), 검토 커밋 `5818403`.

Temp_log는 원본 MERN 구현을 가져오지 않고, Ghost 6.65.0과 MySQL 8.4 LTS를 별도 서비스로 운영하는 구성과 새 개인 테마를 사용한다. 아래 내용은 확인한 파일과 공식 안내에 근거한 기술 검토이며, 모든 권리 관계에 대한 법적 보증은 아니다.

## 원본에서 확인한 사항

- 루트에 LICENSE 파일이나 저장소 전체에 적용되는 명시적 이용 허락이 없다. `server/package.json:15`에만 `MIT`가 선언되어 있어, 이것만으로 클라이언트·문서·자산까지 MIT라고 판단할 수 없다.
- 추적 파일 65개, 커밋 2개이며 작성자 표기는 동일하다. Git 작성자 정보만으로 저작권의 단독 소유나 외부 자료 사용 권한을 증명하지는 못한다.
- 원본 코드, favicon SVG, SKKU 관련 문구, 샘플 프로젝트 본문을 새 서비스에 복사하지 않는다. 원격 Google Fonts 및 Pretendard 로딩도 계승하지 않고 시스템 폰트를 사용한다.

공개 GitHub 저장소라는 사실은 일반적인 복제·수정·재배포 허락을 대신하지 않는다. private 저장소는 접근 범위 설정이며, 제삼자 저작물의 이용 권한을 새로 부여하지 않는다. [GitHub 라이선스 안내](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository)

## Temp_log에서 사용하는 구성 요소

| 구성 요소 | 확인한 라이선스·범위 | 이 저장소에서의 취급 |
| --- | --- | --- |
| 새로 작성한 Temp_log 테마·배포 설정·문서 | 별도 표시가 없으면 UNLICENSED, all rights reserved | 소유자의 개인 사용을 위한 코드이며 공개 사용 허락을 부여하지 않는다. |
| Ghost 6.65.0 | MIT, Ghost Foundation 저작권 | upstream을 사용하며 저작권·허락 고지를 유지한다. |
| MySQL Community Server 8.4 계열 | GPLv2 및 배포물에 명시된 추가 허락·제삼자 라이선스 | Ghost와 별도 프로세스로 운영한다. MySQL 코드를 테마에 복사하거나 링크하지 않는다. |
| 컨테이너 OS, Node.js, Ghost의 전이 의존성 | 각 구성 요소의 라이선스 | 이미지 내부 LICENSE/NOTICE를 보존한다. Ghost의 MIT 하나로 전부 대체하지 않는다. |
| 게시물·사진·영상·첨부 파일 | 작성자·제공자의 권리와 개별 이용 허락 | 업로드 권한은 저작권 허락과 별개다. 직접 만든 자료 또는 사용 허락이 있는 자료만 게시한다. |

UNLICENSED 표시는 새 자체 파일에만 적용된다. Ghost·MySQL·이미지 내부 패키지와 보관한 제삼자 고지를 재라이선스하지 않는다. npm의 `private: true`는 npm 배포 방지 설정이며 GitHub의 private 여부와도 별개다. [npm license 필드 안내](https://docs.npmjs.com/cli/v11/configuring-npm/package-json/#license)

## Ghost 고지 보존

Ghost의 MIT 라이선스는 이용·변경·배포를 허용하며 사본 또는 상당한 부분에 저작권 및 허락 고지를 유지하도록 한다. [Ghost v6.65.0 LICENSE](https://github.com/TryGhost/Ghost/blob/v6.65.0/LICENSE)

검토한 원문을 수정 없이 [third_party/Ghost-LICENSE](../third_party/Ghost-LICENSE)에 보관했다.

- 원본: `https://raw.githubusercontent.com/TryGhost/Ghost/v6.65.0/LICENSE`
- 내려받은 날짜: 2026-09-29
- 크기: 1,065 bytes
- SHA-256: `56df280a26071c1e84578abcb1e7dce02502d27816bce1184617e93ee5b086bf`

이 파일은 Ghost 본체 고지이며, 이미지 전체의 통합 라이선스 목록은 아니다. Ghost나 기본 이미지 버전을 바꾸면 해당 배포물의 고지와 의존성을 다시 확인한다. Ghost 이름을 제품 호환성 설명에 사용하는 것은 로고나 상표의 별도 이용 허락을 뜻하지 않는다.

## MySQL 운영과 배포의 구분

Oracle은 MySQL 서버를 GPLv2와 상용 라이선스의 이중 라이선스 모델로 제공한다. 이 구성은 upstream Community Server를 개인 블로그의 별도 DB 서비스로 실행한다. GPL 프로그램을 자신의 서버에서 실행하는 것만으로 전체 개인 저장소를 공개해야 하는 것은 아니다. [Oracle 라이선스 안내](https://www.mysql.com/about/legal/licensing/oem/), [GNU GPL FAQ](https://www.gnu.org/licenses/gpl-faq.en.html#UnreleasedMods)

MySQL 바이너리나 이를 포함한 컨테이너를 다른 사람에게 전달·재배포하는 경우는 별도다. GPL 고지를 유지하고, 해당 바이너리에 대응하는 소스 제공 등 GPLv2 제3조에 맞는 방식을 충족해야 한다. private registry나 비공개 고객 전달도 접근 제한만으로 이러한 의무를 없애지 않는다. 단순 upstream 홈페이지 링크가 모든 소스 제공 의무를 충족한다고 가정하지 않는다. [GPLv2 원문](https://www.gnu.org/licenses/old-licenses/gpl-2.0.html), [바이너리 재배포 FAQ](https://www.gnu.org/licenses/gpl-faq.en.html#UnchangedJustBinary)

별도 서비스라는 사실이 모든 결합·재배포 형태의 면책 사유는 아니다. MySQL을 수정하거나 상용 제품에 묶어 납품하고, GPL 클라이언트 라이브러리를 새 자체 프로그램에 링크하는 등 범위가 바뀌면 결합 방식·예외 조항·수신자·대응 소스를 다시 검토한다. 현 구성에 대해 MySQL 상용 라이선스 구매가 반드시 필요하다고 판단하지 않았다.

## 검토 한계

원본의 모든 역사적 출처, 향후 업로드할 자료, 컨테이너의 모든 전이 패키지 라이선스를 전수 검증한 것은 아니다. 이미지 패키지와 제삼자 고지는 배포 시점의 SBOM 및 실제 이미지와 함께 관리해야 한다. 의존성의 알려진 보안 문제는 [DEPENDENCY_AUDIT.md](DEPENDENCY_AUDIT.md)에 별도로 기록했다.
