# Kubernetes 운영

이 저장소의 Kubernetes 구성은 개인 블로그용 **Ghost 1개 + MySQL 1개**다. 웹 관리자에서 작성한 글과 설정은 MySQL에, 이미지·첨부파일·설치한 테마는 `ghost-content` PVC에 저장한다. 이 둘을 함께 보관해야 복구할 수 있다. Kubernetes는 프로세스 재시작과 스케줄링을 담당하지만, 이 구성은 DB 고가용성이나 무중단 배포를 제공하지 않는다.

기본 구성에는 공개 Ingress, LoadBalancer, NodePort가 없다. 먼저 로컬 포트 포워딩으로 소유자 계정을 만들고 SMTP를 확인한 다음 공개한다. GitHub 저장소의 private 설정은 배포한 블로그 접근 제어와 별개다.

## 배포 전 준비

- 지원 기간 안의 Kubernetes와 `kubectl`, 동적 PVC를 지원하는 기본 StorageClass가 필요하다. 저장소 드라이버가 `fsGroup` 권한 설정을 지원하는지 확인한다. Ghost와 MySQL이 각각 10Gi를 요청한다.
- NetworkPolicy를 실제 적용하는 CNI가 필요하다. 정책 리소스 생성만으로 네트워크 차단이 보장되지는 않는다.
- SMTP 서버·587번 STARTTLS 포트·인증 계정·검증된 발신 주소가 필요하다. 새 기기 로그인 확인, 비밀번호 재설정 등에 사용하므로 운영 전에 수신까지 시험한다. 기기 확인 기능을 끄지 않는다.
- `temp-log:local`은 이 저장소의 `Dockerfile`, `temp-log-db:local`은 `Dockerfile.mysql`로 만든 이미지다. 로컬 클러스터에는 두 이미지를 로드하고, 원격 클러스터에는 본인 레지스트리의 비공개 이미지와 digest를 사용한다. 필요하면 `imagePullSecrets`를 추가한다. 빌드 머신과 노드의 CPU 아키텍처를 맞춘다.
- Dockerfile의 MySQL 8.4 및 Ghost 기반 이미지는 digest로 고정했다. 최종 이미지 digest는 본인의 빌드·검사 후 정한다. 실제 운영 클러스터에서의 PVC, DNS, 메일, Ingress 동작은 별도 검증해야 한다.

## 비밀값과 첫 실행

아래 명령은 저장소 루트에서 본인이 선택한 클러스터에 실행하는 예시다. 작업 시작 전에 현재 context를 확인한다. 이 문서 작성 과정에서 기존 클러스터에는 접근하거나 배포하지 않았다.

```sh
kubectl config current-context
kubectl kustomize k8s/base
kubectl apply -f k8s/base/namespace.yaml
```

DB 비밀번호는 새로 생성하고, SMTP 정보는 터미널 입력으로 받는다. 다음 스크립트는 비밀값을 화면에 출력하지 않는다. `.secrets/`는 Git에서 제외되지만, 로컬 파일 자체는 평문이므로 접근 권한을 유지하고 운영에서는 비밀 관리 시스템 사용을 권한다. 기존 DB의 비밀번호를 이 방식으로 덮어쓰지 않는다.

```sh
python3 - <<'PY'
from pathlib import Path
from getpass import getpass
import os
import secrets

os.umask(0o077)
directory = Path('.secrets')
directory.mkdir(mode=0o700, exist_ok=True)
keys = ('mysql-password', 'mysql-root-password', 'smtp-host', 'smtp-user', 'smtp-password', 'mail-from')
if any((directory / key).exists() for key in keys):
    raise SystemExit('기존 비밀 파일이 있습니다. 덮어쓰지 않았습니다.')
values = {
    'mysql-password': secrets.token_urlsafe(48),
    'mysql-root-password': secrets.token_urlsafe(48),
    'smtp-host': input('SMTP host: ').strip(),
    'smtp-user': input('SMTP username: ').strip(),
    'smtp-password': getpass('SMTP password: '),
    'mail-from': input('Verified sender email: ').strip(),
}
if not all(values.values()):
    raise SystemExit('빈 값이 있습니다. 비밀 파일을 생성하지 않았습니다.')
for key, value in values.items():
    (directory / key).write_text(value)
PY

kubectl -n temp-log create secret generic temp-log-db \
  --from-file=mysql-password=.secrets/mysql-password \
  --from-file=mysql-root-password=.secrets/mysql-root-password

kubectl -n temp-log create secret generic temp-log-smtp \
  --from-file=smtp-host=.secrets/smtp-host \
  --from-file=smtp-user=.secrets/smtp-user \
  --from-file=smtp-password=.secrets/smtp-password \
  --from-file=mail-from=.secrets/mail-from
```

Kubernetes Secret은 기본적으로 암호화된 저장소가 아니다. 클러스터의 저장 시 암호화, Secret 읽기 RBAC, etcd 백업 접근 권한을 운영자가 관리한다. Ghost 컨테이너에는 애플리케이션 DB 비밀번호만 전달하고, DB root 비밀번호는 MySQL 컨테이너에만 전달한다. 서비스 계정 토큰은 두 Pod 모두 자동 마운트하지 않는다.

원격 환경에서는 본인의 overlay에서 이미지 digest, StorageClass, 자원 한도, 필요 시 image pull Secret을 변경한다. 단순 이미지 변경 예시는 다음과 같다. 예시 주소와 digest를 그대로 적용하면 이미지를 가져올 수 없다.

```yaml
# 본인의 kustomization.yaml 안에 추가
images:
  - name: temp-log
    newName: registry.example.com/your-account/temp-log
    digest: sha256:REPLACE_WITH_YOUR_VERIFIED_IMAGE_DIGEST
  - name: temp-log-db
    newName: registry.example.com/your-account/temp-log-db
    digest: sha256:REPLACE_WITH_YOUR_VERIFIED_DB_IMAGE_DIGEST
```

이미지가 준비되었으면 기본 구성을 적용한다.

```sh
kubectl apply -k k8s/base
kubectl -n temp-log rollout status statefulset/mysql --timeout=10m
kubectl -n temp-log rollout status deployment/ghost --timeout=15m
kubectl -n temp-log get pods,pvc
kubectl -n temp-log port-forward --address=127.0.0.1 service/ghost 2368:2368
```

브라우저에서 `http://localhost:2368/ghost/`를 열고 본인의 이메일과 강한 비밀번호로 **최초 소유자 계정**을 생성한다. 테마를 활성화하고 글·이미지·파일 업로드를 확인한다. SMTP 시험 메일과 새 기기 로그인/비밀번호 재설정 메일이 실제 도착하는지 확인한다. 이 단계에서는 Ingress를 추가하지 않는다. `port-forward`는 API 서버를 통한 별도 접근이며 NetworkPolicy의 일반 Pod 트래픽과 처리 방식이 다르므로, CNI에 따라 별도 검증이 필요하다.

실패 시 우선 Secret 키 이름, PVC의 Pending 상태/권한, MySQL 초기화 로그, DNS 연결을 확인한다.

```sh
kubectl -n temp-log describe pod mysql-0
kubectl -n temp-log logs mysql-0 --tail=100
kubectl -n temp-log logs deployment/ghost --tail=100
```

DB 초기화 도중 실패했다면 기존 볼륨을 임의 삭제하지 않는다. 저장 데이터와 로그를 먼저 확인한다. MySQL 초기화용 환경 변수는 **빈 데이터 디렉터리일 때만** 계정과 DB를 만든다. Secret 변경만으로 이미 생성된 DB 사용자의 비밀번호가 바뀌지 않는다. 비밀번호 교체는 SQL 계정 변경, Secret 교체, 애플리케이션 재시작 순서를 계획해서 수행한다.

## HTTPS 공개

`k8s/overlays/public-example`은 직접 채워 넣어야 하는 별도 예시이며 기본 배포에 포함되지 않는다.

1. 소유자 계정과 SMTP를 먼저 확인한다.
2. 유지 관리되는 Ingress 컨트롤러를 선택하고 실제 `ingressClassName`, 도메인, 유효한 TLS Secret을 지정한다. 특정 컨트롤러를 자동 설치하지 않는다.
3. ConfigMap `url`을 실제 `https://` URL로 바꾼다. Ingress 컨트롤러가 신뢰할 수 있는 `X-Forwarded-Proto: https`를 덮어써 전달하도록 설정한다. HTTP에서 HTTPS로의 강제 리다이렉트, 업로드 크기 제한, 시간 제한은 선택한 컨트롤러에서 설정한다. 업로드 제한은 예를 들어 50MiB부터 사용 목적에 맞게 정한다.
4. 신뢰하는 Ingress 컨트롤러의 namespace에만 `temp-log-access=true` 라벨을 붙인다. 이 라벨을 붙일 권한도 제한한다. 더 세밀한 제한이 필요하면 `networkpolicy.yaml`의 `namespaceSelector`와 **같은 항목**에 컨트롤러 `podSelector`를 함께 지정한다. 라벨 없이 트래픽이 막힌다면 정책을 삭제하지 말고 컨트롤러의 네트워크 경로를 확인한다.
5. 본인의 값으로 편집한 overlay를 적용하고 `kubectl -n temp-log rollout restart deployment/ghost`를 실행한다. 환경 변수로 읽는 ConfigMap/Secret 변경은 실행 중인 프로세스에 자동 반영되지 않는다.
6. TLS, HTTPS 리다이렉트, 관리자 로그인, 작성·업로드, 허가되지 않은 Pod의 DB 접근 차단, Pod 재시작 후 데이터 유지까지 확인한다.

도메인 변경 후에는 메일 안의 링크와 canonical URL도 확인한다. 관리자 경로는 `/ghost/`이며, 별도 관리자 도메인이나 VPN/접근 프록시 제한은 환경에 맞춰 추가할 수 있다. 공개 글이 필요한 사이트에서 `/` 전체를 인증 프록시로 막으면 독자 접근도 제한된다.

## 네트워크와 권한의 범위

| 경로 | 기본 허용 범위 |
| --- | --- |
| Ingress → Ghost | `temp-log-access=true` namespace의 TCP 2368 |
| Ghost → MySQL | 같은 namespace의 MySQL Pod TCP 3306 |
| Ghost → DNS | `kube-system`의 `k8s-app=kube-dns` Pod TCP/UDP 53 |
| Ghost → 외부 | 사설·loopback·link-local 등을 제외한 IPv4 TCP 443, 587 |
| MySQL → 외부 | 허용 규칙 없음 |

외부 HTTPS는 에디터의 외부 콘텐츠 조회 등에, SMTP는 트랜잭션 메일에 사용한다. 이것은 목적지 도메인 allowlist가 아니다. 표준 NetworkPolicy에는 FQDN 필터가 없으므로 더 엄격한 운영에서는 SMTP 제공자 IP와 필요한 HTTPS 목적지만 허용하거나, CNI의 FQDN 정책/egress proxy를 사용한다. IPv6 외부 egress는 기본 허용하지 않는다. 내부 SMTP relay를 사용하거나 465번 SMTPS를 사용하는 환경에서는 목적지·포트와 Ghost mail 설정을 함께 변경한다. 465번은 `secure=true`로 설정한다.

NodeLocal DNSCache, 다른 DNS Pod 라벨, 공개 주소를 사용하는 Pod/Service CIDR, hostNetwork Ingress, CNI의 NAT 정책은 기본 예시와 다를 수 있다. 실제 DNS 경로를 허용하고 본인 클러스터의 Pod/Service/Node CIDR을 외부 egress 예외에 추가한다. NetworkPolicy는 모든 SSRF나 노드 접근을 막는 범용 방화벽이 아니며 노드·클러스터 수준 통제도 필요하다. 선택한 CNI의 정책 동작을 직접 검증한다.

두 워크로드 모두 non-root, `RuntimeDefault` seccomp, capability 전체 제거, 읽기 전용 root filesystem을 사용한다. 쓰기 경로는 Ghost content와 `/tmp`, MySQL data와 socket 디렉터리·`/tmp`로 제한한다. namespace에 Pod Security `restricted`를 강제한다. 컨테이너 UID를 변경하거나 root init container로 권한 문제를 우회하기 전에 StorageClass의 `fsGroup` 지원을 확인한다.

## 백업·복구

백업에는 **MySQL DB + content PVC + 당시 앱 이미지 digest/설정**이 필요하다. Secret 복구는 별도 비밀 관리 절차에 포함한다. Ghost 관리자의 JSON 내보내기만으로는 이미지·첨부파일·전체 DB를 복구할 수 없다. 볼륨 삭제, namespace 삭제, `kubectl delete -k`를 백업 작업에 사용하지 않는다. 특히 namespace 삭제는 이름 아래 PVC도 제거한다.

일관된 백업을 위해 짧은 점검 시간을 잡고 Ghost를 0개로 줄여 글·업로드·예약 발행의 쓰기를 멈춘다. MySQL이 정상 실행 중인 상태에서 DB 논리 백업을 만들고, 같은 중단 구간에 content PVC를 CSI VolumeSnapshot 또는 검증된 볼륨 백업 도구로 복사한다. 스토리지마다 snapshot 기능·삭제 정책·외부 보관 방법이 다르므로 본인 운영 환경에 맞춰 구성한다.

```sh
umask 077
mkdir -p backups
kubectl -n temp-log scale deployment/ghost --replicas=0
kubectl -n temp-log wait --for=delete pod -l app.kubernetes.io/name=ghost --timeout=120s
kubectl -n temp-log exec mysql-0 -- sh -ec \
  'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" exec mysqldump --user=root --single-transaction --no-tablespaces --set-gtid-purged=OFF ghost' \
  > backups/ghost.sql
# 여기서 content PVC의 snapshot/백업을 생성하고 성공을 확인한다.
kubectl -n temp-log scale deployment/ghost --replicas=1
```

위 SQL 파일 하나는 전체 백업이 아니다. 실패한 덤프의 빈 파일을 정상 백업으로 간주하지 않는다. 백업은 암호화하고 클러스터 외부에 보관하며 보관 기간과 삭제 정책을 정한다. SQL에는 계정 정보·콘텐츠가 포함될 수 있다. 정기적으로 별도 namespace에서 새 DB/PVC에 복구하고, 동일한 Ghost 이미지로 로그인·글·미디어를 확인한다. 복구 검증 환경의 외부 메일 발송과 예약 발행을 차단하여 실제 독자에게 중복 메일이 가지 않게 한다.

복구 순서는 Ghost가 멈춘 상태에서 content PVC 복구, 새 MySQL에 SQL 가져오기, DB 자격 증명 일치 확인, 동일 버전 Ghost 기동, 내부 점검, 공개 트래픽 전환이다. 손상된 운영 볼륨을 먼저 덮어쓰지 말고 새 볼륨을 사용한다. 실제 복구 훈련 전에는 복구 가능 또는 RPO/RTO 보장을 주장할 수 없다.

## 업그레이드와 가용성

Ghost는 replica 1과 `Recreate` 전략으로 설정했다. HPA, 동시에 2개 이상의 Ghost 인스턴스, 공유 PVC로의 임의 확장은 이 구성의 범위 밖이다. DB도 단일 인스턴스라 노드 장애 시 중단이 생긴다. 자원 부족은 요청·제한과 관측을 조정해 대응한다. 단일 replica에 강제 PDB를 걸어 노드 drain을 영구 차단하지 않는다.

업그레이드 전 릴리스 노트/보안 공지를 확인하고 DB·content 백업과 복구 시험을 수행한다. 새 image digest를 staging에서 확인한 뒤 적용한다. Ghost는 시작할 때 DB migration을 수행할 수 있다. 따라서 `rollout undo`로 예전 이미지만 되돌리는 것은 안전한 DB rollback이 아니다. downgrade가 필요하면 대응되는 DB/content 백업과 이전 이미지를 함께 복구한다. MySQL 버전도 동일하게 호환성과 복구 절차를 확인한다.

Ghost의 init container는 MySQL의 TCP 포트가 열릴 때까지 기다려 최초 DB 초기화 동안의 불필요한 Ghost 실패를 줄인다. startup probe는 Ghost migration을 기다리고, readiness는 글 목록을 조회하는 홈페이지 `/`와 MySQL SQL 조회를 확인한다. liveness는 열린 TCP 포트를 확인해 일시적 DB 장애가 Ghost 재시작 폭주로 이어지지 않도록 한다. 이 probe만으로 로그인·메일·백업 정상 여부를 판단하지 않는다. Pod 재시작 수, readiness, 메모리, PVC 용량, 5xx, 메일 실패, 백업 결과를 별도로 관측한다.

자동 외부 업데이트 확인과 Explore/RPC ping은 기본 구성에서 끈다. 따라서 새 릴리스/보안 업데이트 확인은 저장소의 의존성 갱신 절차와 운영자가 맡는다.

## 검증 범위

2026-09-29에 기존 클러스터와 분리된 일회용 kind 클러스터(Kubernetes v1.37.0)에서 검증했다. 기본/공개 예시 Kustomize 렌더링과 strict Kubernetes 스키마 검사는 21개 리소스 모두 통과했다. 기본 구성은 Pod Security `restricted` 아래 기동했고, 두 PVC가 Bound 상태가 되었다. 실행 UID는 Ghost 1000, MySQL 999였다.

관리자 계정 생성·로그인·테마 활성화·글 발행·이미지 업로드·태그/RSS/404와 익명 관리자 쓰기 거부(403), 비공개 초안 접근 거부(404)를 확인했다. MySQL을 중지하면 Ghost readiness가 실패하되 재시작 수가 증가하지 않았고, DB가 없는 동안 새 Ghost Pod는 init container에서 기다렸다. MySQL과 Ghost Pod를 다시 만든 후 기존 로그인 세션·글·이미지·초안이 유지되는 것도 확인했다.

kind 기본 CNI의 NetworkPolicy 집행은 검증하지 않았다. 실제 운영 SMTP 수신, 공개 HTTPS/Ingress, 운영 스토리지 장애, 외부 백업과 복구 훈련은 이 테스트에 포함하지 않았다. 운영 클러스터에서 별도로 확인해야 한다.

## 근거 문서

- [Ghost 설정, 메일, 관리자 URL, 기기 확인](https://docs.ghost.org/config/)
- [Ghost 운영 권장 구성](https://docs.ghost.org/hosting/)
- [공식 Ghost 컨테이너 패키징](https://github.com/docker-library/ghost)
- [공식 MySQL 이미지 초기화 동작](https://github.com/docker-library/mysql/blob/master/8.4/docker-entrypoint.sh)
- [Kubernetes NetworkPolicy의 적용 범위와 제약](https://kubernetes.io/docs/concepts/services-networking/network-policies/)
- [Pod Security Standards](https://kubernetes.io/docs/concepts/security/pod-security-standards/)
