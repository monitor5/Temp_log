# 원본 앱 Kubernetes 배포

`k8s/base`는 **원래 React/Express 앱 1개 + MongoDB 1개**, uploads PVC와 DB PVC 각 10Gi로 구성된다. namespace는 `temp-log-original`이다. 이전 Ghost namespace/볼륨을 덮어쓰지 않는다.

1. 기본 StorageClass와 fsGroup을 지원하는 볼륨 드라이버를 준비한다. 두 최종 이미지를 빌드하고 검사한다.
2. 운영 registry에 `temp-log-original`과 `temp-log-mongo`를 push한 뒤 overlay의 `images`에서 검증한 digest를 지정한다. private registry에는 imagePullSecrets가 필요하다. 로컬 kind에는 이미지를 load한다.
3. 현재 context를 확인하고 비밀값을 생성한다. 기존 MongoDB 데이터가 있는 경우 비밀번호를 다시 생성하지 않는다.

```sh
kubectl config current-context
kubectl apply -f k8s/base/namespace.yaml
python3 scripts/init-k8s.py
kubectl -n temp-log-original create secret generic app-secrets --from-env-file=.secrets/original-app.env
kubectl -n temp-log-original create secret generic mongo-secrets --from-env-file=.secrets/original-mongo.env
kubectl apply -k k8s/base
kubectl -n temp-log-original rollout status statefulset/mongo --timeout=10m
kubectl -n temp-log-original rollout status deployment/app --timeout=10m
kubectl -n temp-log-original port-forward --address=127.0.0.1 service/app 8080:4000
```

최초 관리자는 네트워크 API로 생성할 수 없다. 본인이 관리하는 터미널에서 아래처럼 비밀번호를 stdin으로 전달한다. 이미 관리자가 있으면 덮어쓰지 않는다.

```sh
python3 - <<'PY'
from getpass import getpass
import subprocess,json
name=input('Admin username: ').strip()
password=getpass('Password (14+ characters): ')
if password != getpass('Repeat password: '): raise SystemExit('Mismatch')
subprocess.run(['kubectl','-n','temp-log-original','exec','-i','deployment/app','--','node','dist/cli/admin.js'],input=json.dumps({'username':name,'password':password}),text=True,check=True)
PY
```

관리 화면은 `/admin`이다. 비밀번호 복구는 같은 CLI에 `--reset-password`를 명시해 실행한다. 이 작업은 모든 관리자 세션을 폐기한다. kube exec/Secret 권한이 곧 서비스 관리 권한이므로 RBAC와 etcd 저장 암호화를 적용한다.

## 공개

기본 배포에는 공개 Ingress가 없다. `k8s/overlays/public-example`의 도메인·IngressClass·TLS Secret을 본인 환경에 맞게 지정한다. app의 `PUBLIC_URL`을 최종 HTTPS origin으로, `TRUST_PROXY_HOPS`를 실제 신뢰하는 프록시 수로 맞춘다. 기본 예시는 한 홉이다. 컨트롤러가 Forwarded 헤더를 덮어쓰도록 하고 신뢰하는 Ingress namespace에만 `temp-log-access=true` 라벨을 지정한다.

Ingress에서 HTTP→HTTPS, 파일 크기 제한(25MiB보다 여유 있는 multipart 한도), 타임아웃을 설정한다. 특정 컨트롤러를 자동 설치하지 않는다. 쿠키의 Secure와 쓰기 Origin 검사가 PUBLIC_URL을 사용하므로 잘못된 주소를 넣으면 로그인/저장이 거부될 수 있다. 환경변수/Secret 변경은 Pod 재시작이 필요하다.

## 데이터·권한·확장

- app은 MongoDB의 archlog DB에만 readWrite 권한을 사용한다. root 비밀번호는 Mongo 컨테이너에만 전달된다.
- 비루트 UID1000/999, 읽기 전용 root, capability 제거, seccomp, 자원 제한, 서비스계정 토큰 자동 마운트 해제를 사용한다.
- NetworkPolicy는 app→Mongo27017와 DNS만 허용한다. Mongo 외부 접근은 기본 거부다. 정책을 집행하는 CNI가 필요하며 kindnet만으로는 차단 시험을 했다고 볼 수 없다. NodeLocal DNS 등 클러스터별 차이는 직접 조정한다.
- readiness는 MongoDB ping까지 확인하고 liveness는 Node HTTP 응답만 확인한다. DB 장애가 앱 재시작 폭주가 되지 않도록 구분한다. 첫 시작은 init container가 DB TCP를 기다린다.
- 원본의 로컬 업로드와 메모리 rate limit을 유지하므로 **app replica1/Recreate**다. 다중 replica가 필요하면 파일 저장·공유 rate limit을 먼저 바꾼다.
- 백업은 app 쓰기를 중단하고 MongoDB를 정상 종료한 뒤 DB/업로드 PVC를 같은 시점의 세트로 snapshot/백업한다. 클러스터 외부에 암호화 보관하고 새 namespace/PVC에서 실제 복원을 시험한다. namespace/PVC 삭제는 백업 절차가 아니다.
- 이번 Mongo 이미지는 mongod/mongosh와 명령 인자 설정만 사용한다. 별도 database-tools, root 전환 도구, 오래된 YAML 로더는 제외했다. 논리 export/import가 필요하면 별도로 검증한 최신 관리 도구를 사용한다.

운영 TLS·DNS·스토리지 장애·외부 백업은 별도로 검증해야 한다. 단일 DB이므로 HA나 무중단 업그레이드를 제공하지 않는다. 스키마/DB 버전을 바꾸기 전에는 복사본 검증과 대응되는 백업이 필요하다.
