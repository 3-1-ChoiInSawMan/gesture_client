# SFU 클라이언트 연동

상위 `SFU.md`와 `gesture_NestJS_Backend/src/calls`, `src/sfu` 구현에 맞춘 mediasoup-client v3 연동이다. SpringBoot 코드는 변경하지 않는다.

## 연결과 미디어

- `/calls` Socket.IO의 `calls_ready` 인증 완료 알림을 기다린다.
- REST `POST /api/v1/calls/:roomIdx/join`을 완료한 후 `join_call`을 보낸다. 네트워크 재접속 때도 통화 참여를 다시 등록한다.
- Router capabilities로 Device를 초기화하고 send/recv Transport를 만든다. `connect_transport`는 SDK의 `connect` 콜백에서만 보낸다.
- `audio`, `camera`, `screen` mediaTag별 Producer를 만든다. 로컬 트랙은 화면에서 소유하므로 SDK의 `stopTracks`는 false다.
- 로컬 장치를 끄면 Producer를 닫고, 빠른 재활성화는 서버 종료 ACK 뒤에 처리한다. 트랙 교체는 `replaceTrack`을 사용한다.
- `existingProducers`와 먼저 도착한 `new_producer`를 대기열에 모아 중복 없이 consume한다. 로컬 Consumer를 생성한 뒤 `resume_consumer`를 보낸다.
- Producer 정지·재개·종료와 참가자 퇴장을 화면에 반영한다. 발화 표시는 수신 오디오를 분석한다.
- 연결 오류를 표시하고 재연결 버튼을 제공한다. Transport 실패 시 `restart_ice` 결과를 SDK에 적용한다.
- `leave_call` ACK의 `coreSynced: false` 또는 실패 시 REST 퇴장을 시도한다. 재시도는 이전 REST 등록·정리가 끝난 뒤 시작한다.

## 자막

서버의 기존 JSON `{ callRoomIdx, text }`와 `frame_translation` / `audio_translation` 이벤트를 그대로 사용한다. 방 전체에 이미 전달되므로 P2P 재전달 및 로컬 손 감지 여부로 수신을 차단하던 처리는 제거했다.

이 응답에는 사용자 ID/닉네임이 없다. 화면과 회의록은 발화자를 추측하지 않고 `수어 번역` / `음성 번역`으로 표시한다. 참가자별 이름을 표시하려면 백엔드에서 발화자 식별자를 추가해야 한다.

기존 클라이언트의 별도 `/cc_stt` 직접 연결은 문서에 있는 `send_audio` Socket.IO 요청으로 연결했다. 마이크 입력은 기존처럼 16 kHz 모노 PCM16 little-endian이다. 영상 SFU 송출과 AI 오디오 입력은 별도다. `send_frame` 데이터 구조도 유지한다. AI ACK의 `accepted: false` 및 오류를 안내하고, 느린 ACK 동안 같은 종류의 요청을 무제한 쌓지 않는다.

**실서버 확인 필요:** NestJS는 오디오를 AI `/cc`에 JSON으로 넘긴다. 기존 직접 STT는 `/cc_stt`에 바이너리를 전송했다. AI의 `/cc`가 현재 Buffer JSON의 PCM16 입력을 지원하는지, 요청과 번역 응답의 대응이 맞는지는 실제 AI 서버 연동으로 확인해야 한다. 로컬에 있는 NestJS 코드만으로 AI 내부 처리를 검증할 수 없다.

## 환경과 배포

- `NEXT_PUBLIC_API_URL`: 로컬 REST 주소, `/api/v1`까지 포함.
- `BACKEND_URL`: 로컬 개발과 배포 모두 Next 프록시 대상, `/api/v1` 없이 서버 origin.
- `NEXT_PUBLIC_WEBRTC_CONNECTION_MODE`: 기본 `proxy`. 브라우저는 같은 origin의 `/socket.io`로 polling 연결하고 Next가 BFF로 전달한다. 기존 WS URL 설정이 있어도 기본은 proxy다.
- `NEXT_PUBLIC_WEBRTC_WS_URL`: `direct` 모드에서만 사용하는 `/calls` 포함 주소. HTTPS 페이지에서 비 TLS 주소는 프록시로 대체한다. 직접 연결하려면 Socket.IO 서버에도 CORS 설정이 필요하다.
- `NEXT_PUBLIC_WEBRTC_SOCKET_PATH`: 기본 `/socket.io`. 서버/프록시 경로와 일치시킨다.
- 기존 Mesh 서버와 이 SFU 클라이언트는 호환되지 않는다. 프론트·NestJS를 대응 버전으로 배포한다.
- 백엔드 기본 `WEBRTC_LISTEN_IP=127.0.0.1`은 외부 시연용이 아니다. 서버의 `WEBRTC_ANNOUNCED_IP`, 실제 bind 주소, `MEDIASOUP_MIN_PORT`~`MEDIASOUP_MAX_PORT` UDP/TCP 접근을 확인한다. 기본 범위는 6002~6202다. HTTP 프록시 설정만으로 미디어 포트가 열리지는 않는다.

## 검증

2026-10-19 배포 BFF의 Engine.IO 응답은 200이지만 localhost Origin에 대한 Access-Control-Allow-Origin이 없었다. REST의 enableCors와 별도로 Socket.IO 서버 CORS 설정이 필요하다. 현재 프론트는 같은 origin 프록시를 사용한다. Next의 끝 슬래시 리다이렉트로 인한 404를 방지하기 위해 `/socket.io`를 BFF의 `/socket.io/`로 명시적으로 rewrite한다.

로컬 테스트 서버에서 프록시 Engine.IO GET/POST 및 `/calls` 연결을 확인했다. 빈 토큰 테스트는 BFF의 AUTH_007까지 도달했다. 실제 인증 계정으로 통화와 AI 결과를 검증한 것은 아니다.

## 수어 좌표 계약 확인 필요

현재 useSignLanguage는 MediaPipe의 정규화된 x/y에 x=1-x 좌우 반전을 적용한다. 왼손 21점, 오른손 21점, 양쪽 어깨 2점 순서로 88개 숫자를 만들고 30프레임을 모아 `frame`에 보낸다. 누락된 손/어깨는 0으로 채운다. 어깨 중심 이동, 어깨 너비 스케일링, 평균/표준편차 정규화는 하지 않는다.

그러나 현재 로컬 NestJS의 send-frame.dto.ts는 frame의 각 원소를 길이 2인 `[x,y]`로 검증한다. 따라서 기존 30×88 배치는 이 DTO와 맞지 않는다. AI 입력 계약이 30×88인지 단일 프레임 44×2인지 백엔드/AI 담당자가 확정해야 한다. 시간축과 좌표 순서를 임의로 바꾸지 않도록 현재 송신 형식은 유지했다.

- Node 24에서 `npm run test:sfu`: SDK/Socket.IO 대역을 이용한 연결 순서, 중복/종료 경합, 트랙 교체, 자막, 오류, 퇴장, ICE 재시작 회귀 테스트.
- `npx tsc --noEmit`, `npm run build`.
- 배포 후 실제 계정으로 2명 및 3명 이상 입장. 늦은 입장, 카메라 없이 마이크만 켜기, 카메라/마이크 연속 토글, 화면 공유 중 입장·종료, 새로고침·네트워크 재연결·퇴장을 확인한다.
- 서로 다른 네트워크와 모바일에서 영상/음성, 오디오 자동재생, 화면 공유 지원 여부를 확인한다.
- AI 연결 중/끊김 상태에서 수어·음성 자막이 모든 참가자에게 중복 없이 보이는지 확인한다.

회귀 테스트는 실제 브라우저의 ICE/DTLS 연결이나 AI 인식을 대신하지 않는다.
