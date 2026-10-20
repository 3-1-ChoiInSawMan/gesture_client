<div align="center">

<img src="src/assets/images/logo.png" alt="Gesture 로고" width="180">

# 제스처 (Gesture)

### 영상통화 기반 실시간 수어 번역 플랫폼 · Frontend

<img src="https://raw.githubusercontent.com/yoonjeonggg/readme-assets/main/gesture/%EC%A0%9C%EC%8A%A4%EC%B2%98_%EB%AA%A9%EC%97%85.png" alt="Gesture 서비스 목업" width="800">

한국어 · [English](README.en.md)

</div>

## 프로젝트 소개

수어와 음성을 사용하는 사람들이 영상통화 안에서 대화할 수 있도록 돕는 웹 플랫폼입니다. 이 저장소는 통화 화면, 자막, 채팅, 회의록과 계정 관리 등 사용자가 접하는 프론트엔드를 담당합니다.

- Next.js App Router 기반으로 서비스 화면과 라우팅 구성
- mediasoup SFU 기반 영상·음성 통화 및 화면 공유 구현
- 브라우저에서 수어 좌표와 음성 데이터를 수집하고 AI 결과를 자막으로 표시
- NestJS BFF를 통해 인증·통화방·친구·회의록 API 연동

## 팀 구성

**최인소맨 (ChoiInSawMan)** · 프론트엔드 1명, 백엔드 3명, AI 1명

| 담당 | 구성원 |
| --- | --- |
| 프론트엔드 | [김환성 · hwnsng](https://github.com/hwnsng) |
| AI · 팀장 | [yeeeengyu](https://github.com/yeeeengyu) |
| 백엔드 · Core | [yoonjeonggg](https://github.com/yoonjeonggg) |
| 백엔드 | [acorn497](https://github.com/acorn497), [swimim](https://github.com/swimim) |

## 1. 개발 환경 및 기술 스택

| 구분 | 기술 | 사용 목적 |
| --- | --- | --- |
| 개발 환경 | Node.js 24, npm | 로컬 실행, 빌드, 테스트 |
| 웹 프레임워크 | Next.js 16, React 19 | 페이지 구성과 컴포넌트 렌더링 |
| 언어 | TypeScript | API·소켓 데이터와 컴포넌트 타입 정의 |
| 스타일 | Tailwind CSS 4, Lucide React | 화면 스타일과 아이콘 |
| 상태 관리 | Zustand | 인증·통화방·채팅 상태 관리 |
| API 통신 | Axios | REST 요청과 인증 토큰 처리 |
| 실시간 통신 | Socket.IO Client | 통화 시그널링과 실시간 이벤트 |
| 미디어 | WebRTC, mediasoup-client | SFU 영상·음성 송수신과 화면 공유 |
| 수어·음성 입력 | MediaPipe Holistic, MediaRecorder API | 손·어깨 좌표 추출과 마이크 오디오 처리 |

### 주요 구현 선택

- **SFU 연동:** 참가자별 P2P 연결 대신 서버의 Transport·Producer·Consumer를 관리하도록 통화 로직 분리
- **MediaPipe:** 영상에서 좌표를 추출하고 30프레임 단위로 묶어 수어 인식 서버에 전달
- **Next 프록시:** 같은 출처의 REST·Socket.IO 경로로 BFF에 접근하도록 구성
- **Zustand:** 여러 화면에서 사용하는 인증·친구 채팅·방 목록 상태 공유

## 2. 서비스 연결 구조

| 데이터 | 현재 연결 경로 |
| --- | --- |
| 계정·통화방·회의록 | 프론트 → NestJS BFF → Core 서버 |
| 통화 시그널링 | 프론트 ↔ BFF `/calls` Socket.IO |
| 영상·음성 미디어 | 브라우저 ↔ mediasoup SFU ↔ 상대 브라우저 |
| 수어 자막 | 프론트 좌표 → BFF `send_frame` → AI `/cc` → BFF → `frame_translation` |
| 음성 자막 | 프론트 ↔ AI `/cc_stt` 직접 WebSocket 연결 |

HTTP 프록시는 API와 소켓 메시지를 전달합니다. 실제 통화 미디어는 SFU에 직접 연결하므로 서버의 공개 IP와 미디어 포트 설정이 별도로 필요합니다.

## 3. 주요 기능 및 프론트엔드 역할

| 영역 | 구현 내용 |
| --- | --- |
| 인증·회원 | 이메일 인증 회원가입, 로그인, 토큰 갱신, 프로필 수정 |
| 통화방 | 공개·비공개 방 생성 및 참여, 검색·목록, 참가 인원 설정 |
| 영상통화 | 카메라·마이크 제어, 참가자 상태, 화면 공유, 연결 오류와 재연결 처리 |
| 수어 자막 | 손 평균 x 기준 슬롯 배치, 반전 없는 손·어깨 좌표 30×88 전송 |
| 음성 자막 | 마이크 수집, AI 직접 연결, 텍스트 응답 표시 |
| 대화 도구 | 친구 관리, 채팅, 수어 퀵슬롯 |
| 회의록 | 자막 기록 누적과 회의록 시작·종료 API 연동 |

### 통화 리소스 관리

- 입장 전에 미디어 이벤트를 구독하고 Transport 준비 전 알림 보관
- 중복 Producer 알림과 소비 중 종료된 트랙 처리
- 카메라·화면 공유 전환 및 퇴장 시 미디어 자원 정리
- 방 삭제·퇴장 실패가 정상 종료처럼 처리되지 않도록 오류 반영

## 4. 프로젝트 구조

```text
src/
├── app/                    # 홈, 인증, 통화 등 페이지와 레이아웃
├── api/                    # Axios 설정과 도메인별 REST API
├── components/
│   ├── callroom/           # 통화방 생성·참여 모달
│   ├── videoroom/          # SFU 세션, 미디어, 자막, 통화 UI
│   ├── friends/            # 친구·채팅 화면
│   └── profile/            # 계정·프로필 화면
├── hooks/                  # 공통 훅
├── store/                  # Zustand 상태 관리
├── lib/                    # 소켓 및 회의록 등 공통 로직
└── assets/                 # 이미지·로고
tests/                      # SFU·STT 회귀 테스트
docs/                       # 연동·문제 분석 문서
```

## 5. 실행 방법

Node.js 24와 npm, 실행 중인 BFF가 필요합니다. 백엔드와 AI는 이 저장소에서 함께 실행되지 않습니다.

```bash
git clone https://github.com/3-1-ChoiInSawMan/gesture_client.git gesture-client
cd gesture-client
npm ci
```

`.env.example`을 `.env.local`로 복사하고 실제 서버 주소에 맞게 설정합니다.

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1
BACKEND_URL=http://localhost:8080
NEXT_PUBLIC_WEBRTC_CONNECTION_MODE=proxy
NEXT_PUBLIC_WEBRTC_SOCKET_PATH=/socket.io
NEXT_PUBLIC_STT_WS_URL=wss://gesture.ingyuc.click/cc_stt
```

| 변수 | 설명 |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | HTTP 개발 환경의 REST 주소. `/api/v1` 포함 |
| `BACKEND_URL` | Next 서버 프록시 대상. `/api/v1` 제외 |
| `NEXT_PUBLIC_WEBRTC_CONNECTION_MODE` | 기본 `proxy`, 직접 연결 시 `direct` |
| `NEXT_PUBLIC_WEBRTC_WS_URL` | 직접 연결할 소켓 주소. `/calls` 포함 |
| `NEXT_PUBLIC_WEBRTC_SOCKET_PATH` | 직접 연결 시 소켓 경로. 기본 `/socket.io` |
| `NEXT_PUBLIC_STT_WS_URL` | 음성 인식 AI WebSocket 주소 |

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000)에 접속합니다. 환경변수를 변경하면 개발 서버를 재시작합니다.

## 6. 사용 방법

1. 이메일 인증과 회원가입을 완료하고 로그인합니다.
2. 통화방을 만들거나 기존 방에 참여합니다. 생성 화면에서는 방 이름·설명·공개 범위·유형·최대 인원을 설정합니다.
3. 카메라·마이크 권한을 허용하고 장치를 켭니다.
4. 자막 표시를 켭니다. 수어 동작은 양손과 어깨가 화면 안에 보이도록 진행합니다.
5. 필요에 따라 채팅, 화면 공유, 회의록 기능을 사용합니다.
6. 나가기 버튼으로 종료합니다. 방장은 방 삭제를 요청하며, 실패하면 오류를 표시합니다.

## 7. 테스트 및 배포

| 명령어 | 설명 |
| --- | --- |
| `npm run dev` | 개발 서버 |
| `npm run build` | 프로덕션 빌드·타입 검사 |
| `npm start` | 빌드된 앱 실행 |
| `npm run lint` | ESLint 검사 |
| `npm run test:sfu` | SFU 세션·소켓 설정 회귀 테스트 |
| `npm run test:stt` | STT 바이너리 전송·녹음 정리·응답 파싱 테스트 |

- 카메라·마이크 사용에는 HTTPS 또는 localhost가 필요합니다.
- 배포 환경에도 `BACKEND_URL`을 설정합니다. 공개 환경변수 변경 시 재빌드합니다.
- 기본 통화 소켓은 Next 프록시를 통한 HTTP polling을 사용합니다. 직접 연결은 Socket.IO CORS 설정이 필요합니다.
- 1:1 영상·음성과 카메라 전환은 사용자 테스트로 확인했습니다. 다자간·모바일은 추가 검증이 필요합니다.

## 8. 연동 이슈 및 트러블슈팅

| 증상 | 확인·대응 |
| --- | --- |
| Socket.IO CORS 오류 | 동일 출처 프록시와 `/socket.io` 경로 처리 적용 |
| 영상은 검고 캠 상태만 반영됨 | SFU 공개 IP와 UDP/TCP 미디어 포트 확인. `webrtc-internals`로 ICE 상태 점검 |
| 손은 감지되지만 수어 자막이 없음 | 최신 BFF는 88개 벡터를 허용함. 실제 배포 버전, 요청 ACK, AI 결과와 배치 간격 확인 |
| STT 연결은 되지만 텍스트가 없음 | AI 디코딩 로그 확인. 장시간 입력 시 청크 버퍼의 컨테이너 헤더 유실 여부 확인 |

`손 감지됨`은 브라우저의 좌표 검출 상태이며 번역 성공을 뜻하지 않습니다. 음성은 AI로 직접 전송하며, STT 결과 텍스트는 기존 통화방 채팅 연결로 공유해 각 참가자의 음성 자막에 표시합니다. 모든 참가자가 최신 프론트를 사용하고 자막 표시를 켜야 합니다.

- [SFU 연동 문서](docs/sfu-integration.md)
- [자막 코드 대조 결과](docs/caption-contract-review.md)
- [NestJS BFF 저장소](https://github.com/3-1-ChoiInSawMan/gesture_NestJS_Backend)

<div align="center">
  <sub>팀 최인소맨 · Gesture Frontend</sub>
</div>
