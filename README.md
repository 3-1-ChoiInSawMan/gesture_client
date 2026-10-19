# Gesture

**한국어** | [English](README.en.md)

수어와 음성을 사용하는 사람들이 영상통화 안에서 대화할 수 있도록 돕는 웹 서비스의 프론트엔드입니다.

## 주요 기능

| 기능 | 설명 |
| --- | --- |
| 영상통화 | mediasoup SFU 기반 영상·음성 송수신, 카메라·마이크 제어, 화면 공유 |
| 자막 | MediaPipe 수어 좌표와 마이크 음성을 BFF에 전송하고 번역 결과 표시 |
| 통화방 | 방 생성·참여, 참가자 목록, 공개·비공개 방 관리 |
| 대화 도구 | 채팅, 친구 관리, 수어 퀵슬롯 |
| 회의록 | 통화 중 자막 기록과 회의록 API 연동 |
| 계정 | 이메일 인증, 로그인, 프로필 관리 |

> 자막과 회의록은 백엔드·AI 서버 연동이 필요합니다. 현재 수어 입력 DTO와 STT 경로의 호환성을 확인 중이며, 영상통화 성공만으로 자막 동작이 보장되지는 않습니다.

## 기술 스택

| 구분 | 기술 |
| --- | --- |
| 웹 | Next.js 16, React 19, TypeScript |
| 스타일·상태 | Tailwind CSS 4, Zustand |
| 통신 | Axios, Socket.IO Client |
| 영상·인식 | WebRTC, mediasoup-client, MediaPipe Holistic, Web Audio API |

## 로컬 실행

- Node.js 24와 npm을 사용합니다. SFU 테스트는 Node.js의 TypeScript 실행 기능을 사용합니다.
- 카메라·마이크 권한과 실행 중인 BFF가 필요합니다.
- [NestJS 백엔드](https://github.com/3-1-ChoiInSawMan/gesture_NestJS_Backend)는 별도로 실행합니다.

```bash
git clone https://github.com/3-1-ChoiInSawMan/gesture_client.git gesture-client
cd gesture-client
npm ci
```

`.env.example`을 `.env.local`로 복사하고 BFF 주소를 설정합니다.

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1
BACKEND_URL=http://localhost:8080
NEXT_PUBLIC_WEBRTC_CONNECTION_MODE=proxy
NEXT_PUBLIC_WEBRTC_SOCKET_PATH=/socket.io
```

```bash
npm run dev
```

[localhost:3000](http://localhost:3000)에 접속합니다. 원격 BFF를 사용한다면 위 두 주소를 해당 서버 주소로 변경합니다.

### 환경변수

| 변수 | 용도 |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | HTTP 로컬 개발에서 사용하는 REST 주소. `/api/v1` 포함 |
| `BACKEND_URL` | Next 서버의 REST·Socket.IO 프록시 대상. `/api/v1` 제외 |
| `NEXT_PUBLIC_WEBRTC_CONNECTION_MODE` | 기본 `proxy`. BFF 직접 연결은 `direct` |
| `NEXT_PUBLIC_WEBRTC_WS_URL` | `direct` 모드의 소켓 주소. `/calls` 포함 |
| `NEXT_PUBLIC_WEBRTC_SOCKET_PATH` | 직접 연결 시 소켓 경로. 기본 `/socket.io` |

- HTTPS 페이지의 REST 요청은 `/api/v1` 프록시를 사용합니다.
- 직접 소켓 연결은 서버의 Socket.IO CORS 설정이 필요하며, HTTPS 페이지에서는 보안 연결 주소를 사용합니다.
- 환경변수 변경 후 개발 서버를 재시작합니다. 배포 시 공개 환경변수 변경은 재빌드가 필요합니다.

## 사용 방법

1. 회원가입과 이메일 인증을 완료한 뒤 로그인합니다.
2. 통화방 목록에서 방을 만들거나 기존 방에 참여합니다.
3. 카메라·마이크 권한을 허용하고 필요한 장치를 켭니다.
4. 자막 버튼을 켜 번역 결과를 표시합니다. `손 감지됨`은 브라우저의 손 검출 상태이며 번역 완료를 뜻하지 않습니다.
5. 필요에 따라 화면 공유, 채팅, 회의록 기능을 사용합니다.
6. 나가기 버튼으로 종료합니다. 방장은 방 삭제를 요청하며, 실패하면 오류가 표시됩니다.

## 명령어

| 명령어 | 설명 |
| --- | --- |
| `npm run dev` | 개발 서버 실행 |
| `npm run build` | 프로덕션 빌드 및 타입 검사 |
| `npm start` | 빌드된 앱 실행 |
| `npm run lint` | ESLint 검사 |
| `npm run test:sfu` | SFU 세션·소켓 설정 회귀 테스트 |

## 배포·테스트 참고

- 카메라·마이크는 HTTPS 또는 localhost에서 사용합니다.
- 배포 서버에도 `BACKEND_URL`을 설정합니다. 현재 기본 소켓 연결은 Next 프록시를 통한 HTTP polling입니다.
- SFU 영상·음성은 브라우저와 SFU 서버가 직접 주고받습니다. 백엔드의 공개 IP와 미디어 포트 개방이 별도로 필요합니다.
- 1:1 영상·음성 및 카메라 전환을 사용자 테스트로 확인했습니다. 다자간 통화와 모바일 호환성은 추가 검증이 필요합니다.
- 자동 테스트는 실제 카메라·네트워크·AI 인식 테스트를 대체하지 않습니다.

자세한 연결 흐름과 서버 확인 사항은 [SFU 연동 문서](docs/sfu-integration.md)를 참고합니다.
