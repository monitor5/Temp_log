# 의존성 검토 기록

검토일: 2026-09-29. 대상 원본: [monitor5/sspark_portpolio](https://github.com/monitor5/sspark_portpolio), 커밋 `5818403`.

원본의 잠금 파일은 취약하거나 지원이 끝난 패키지를 포함한다. Temp_log는 이 의존성 트리를 이식하지 않고 Ghost 6.65.0과 MySQL 8.4 LTS를 사용한다. 웹 관리자와 업로드 기능은 upstream Ghost가 제공하며, 새 테마에는 자체 npm 의존성이 없다. 이는 서비스 전체에 의존성이나 취약점이 없다는 뜻은 아니다.

## 수행 방법과 한계

원본의 root, client, server 각각의 `package.json`과 `package-lock.json`을 소스 밖 임시 디렉터리에 복사한 뒤 npm 11.6.2로 다음 명령을 실행했다.

```sh
npm audit --package-lock-only --ignore-scripts --json
```

원본 애플리케이션·seed·install script는 실행하지 않았다. 원본 파일도 수정하지 않았다. 결과는 당시 npm advisory 응답과 잠금 버전에 근거하며, 실제 공격 경로 검증이나 전체 보안 점검을 대신하지 않는다. 개발 의존성과 운영 의존성을 함께 검사했다.

## 원본 검사 결과

| 범위 | lockfile package 항목 | Low | Moderate | High | Critical | 취약 package 결과 합계 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| root | 29 | 0 | 0 | 1 | 1 | 2 |
| client | 399 | 2 | 4 | 13 | 0 | 19 |
| server | 510 | 1 | 4 | 11 | 1 | 17 |
| 단순 합산 | 938 | 3 | 8 | 25 | 2 | 38 |

938개 package 항목과 38개 결과는 프로젝트 사이 중복을 제거하지 않은 수다. 하나의 package 결과가 여러 advisory를 포함할 수 있으며, 동일 advisory가 여러 package에 영향을 줄 수 있다. 따라서 이 값을 고유 CVE 수나 실제 악용 가능한 취약점 수로 표현하지 않는다.

특히 이번 npm 응답은 `multer@1.4.5-lts.2`를 결과에서 누락했지만, 공식 Multer advisory는 해당 버전의 DoS 문제를 명시한다. 아래 Multer 행은 공식 자료로 보완한 결과이며 위 npm 합계에 임의로 더하지 않았다.

| 패키지 / 잠금 버전 | 관찰한 문제 | 근거 |
| --- | --- | --- |
| `shell-quote@1.8.3` (root) | audit에서 critical; 명령 인용 처리 문제 | [GHSA-w7jw-789q-3m8p](https://github.com/advisories/GHSA-w7jw-789q-3m8p) |
| `vite@5.4.21` (client) | 지원 종료 계열이며 개발 서버 경로 처리 advisory 존재 | [지원 정책](https://vite.dev/releases), [GHSA-4w7w-66w2-5vf9](https://github.com/advisories/GHSA-4w7w-66w2-5vf9) |
| `react-router-dom@6.30.2` (client) | open redirect/XSS 관련 advisory | [GHSA-jjmj-jmhj-qwj2](https://github.com/advisories/GHSA-jjmj-jmhj-qwj2) |
| `multer@1.4.5-lts.2` (server) | deprecated; 잘못된 multipart 요청으로 프로세스 종료 가능 | [공식 GHSA-g5hg-p3ph-g8qg](https://github.com/expressjs/multer/security/advisories/GHSA-g5hg-p3ph-g8qg) |
| `mongoose@8.20.1` (server) | 필터 sanitization 및 prototype pollution 관련 advisory | [GHSA-wpg9-53fq-2r8h](https://github.com/advisories/GHSA-wpg9-53fq-2r8h), [GHSA-664h-wqgq-64gw](https://github.com/advisories/GHSA-664h-wqgq-64gw) |
| `tar@6.2.1` (server 전이 의존성) | audit에서 critical; 압축 해제 경로 처리 등 다수 advisory | [GHSA-8qq5-rm4j-mr97](https://github.com/advisories/GHSA-8qq5-rm4j-mr97) |

원본 서버 lockfile에는 `are-we-there-yet`, `gauge`, `glob`, `inflight`, `multer`, `npmlog`, `rimraf`, `superagent`, `supertest`의 deprecated 표시가 있었다. 원본 README의 Node 18+ 최소 요구사항도 현재 운영 기준으로 적절하지 않다. 검토일 기준 Node 18·20은 EOL이며 Node 22·24는 LTS다. [Node.js 공식 지원 현황](https://nodejs.org/en/about/previous-releases)

## 원본 라이선스 메타데이터

| lockfile의 license 값 | package 항목 수 |
| --- | ---: |
| MIT | 797 |
| ISC | 74 |
| Apache-2.0 | 28 |
| BSD-3-Clause | 18 |
| BSD-2-Clause | 11 |
| 0BSD | 2 |
| CC-BY-4.0 | 2 |
| Python-2.0 | 1 |
| `(MIT OR CC0-1.0)` | 1 |
| 누락 | 4 |

누락 항목은 `spawn-command`, `busboy`, `exit`, `streamsearch`다. 누락은 곧 사용 금지나 라이선스 부재를 의미하지 않고, 실제 배포물의 LICENSE를 확인해야 한다는 뜻이다. 이 표는 메타데이터 집계이며 전체 패키지의 고지·저작권 파일까지 검증한 목록은 아니다. 원본 의존성은 새 서비스에 복사하지 않는다.

## 대체 구성과 후속 검증 범위

- Ghost는 upstream `6.65.0-alpine` 이미지를 기반으로 관리한다. 코어를 직접 고쳐 별도 CMS를 유지하지 않고, 새 테마와 운영 설정만 관리한다. [Ghost v6.65.0 소스](https://github.com/TryGhost/Ghost/tree/v6.65.0)
- DB는 MySQL 8.4 LTS 계열을 사용한다. Ghost 공식 hosting 문서의 지원 환경과 실제 선택한 이미지 버전을 함께 확인한다. [Ghost hosting 문서 원본](https://github.com/TryGhost/Docs/blob/main/hosting.mdx)
- 원본의 JWT 저장소, 직접 만든 관리자 인증, Multer 업로드 API, 댓글 비밀번호 처리, MongoDB와 React 빌드 체인은 가져오지 않는다. 동일한 기능 위험이 Ghost에서 모두 사라진다고 단정하지 않고 upstream 보안 업데이트를 따른다.
- 컨테이너에는 Ghost의 npm 패키지, Node.js, Alpine/기타 OS 패키지와 MySQL 의존성이 남는다. 새 테마의 npm 의존성이 0개라는 사실과 운영 이미지의 보안 상태를 구분한다.

이 문서는 새 Ghost/MySQL 이미지에 대한 취약점 스캐너 실행 결과를 포함하지 않는다. 출시 이미지의 실제 digest를 대상으로 SBOM과 취약점 보고서를 생성하고, Ghost 보안 공지 및 이미지 업데이트와 함께 관리해야 한다. 태그는 재게시될 수 있어 digest 기준 검증이 필요하다. [Ghost 보안 공지](https://github.com/TryGhost/Ghost/security/advisories)

라이선스의 적용 범위와 이미지 재배포 의무는 [LICENSE_REVIEW.md](LICENSE_REVIEW.md)를 참고한다. 검토일 이후 새 advisory가 추가될 수 있으므로 이 기록을 영구적인 무취약 판정으로 사용하지 않는다.

후속 컨테이너 스캔과 제거/패치 결과는 [CONTAINER_AUDIT.md](CONTAINER_AUDIT.md)에 기록했다. 위 표는 원본 npm lockfile 분석이며 새 서비스의 결과와 혼합하지 않는다.
