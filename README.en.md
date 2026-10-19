# Gesture

[한국어](README.md) | **English**

The web frontend for a video calling service that helps people communicate using sign language and speech.

## Features

| Feature | Description |
| --- | --- |
| Video calls | mediasoup SFU audio/video, camera and microphone controls, screen sharing |
| Captions | Sends MediaPipe landmarks and microphone audio to the BFF and displays translation results |
| Call rooms | Room creation and participation, participant lists, public and private rooms |
| Communication | Chat, friends, and sign language quick slots |
| Meeting notes | Caption transcripts and meeting notes API integration |
| Accounts | Email verification, login, and profile management |

> Captions and meeting notes require backend and AI services. Sign language DTO compatibility and the STT routing contract are still being checked. A working video call does not guarantee working captions.

## Tech stack

| Area | Technologies |
| --- | --- |
| Web | Next.js 16, React 19, TypeScript |
| Styling and state | Tailwind CSS 4, Zustand |
| Networking | Axios, Socket.IO Client |
| Media and recognition | WebRTC, mediasoup-client, MediaPipe Holistic, Web Audio API |

## Local setup

- Use Node.js 24 and npm. SFU tests use Node.js support for running TypeScript files.
- Camera and microphone permissions and a running BFF are required.
- Run the [NestJS backend](https://github.com/3-1-ChoiInSawMan/gesture_NestJS_Backend) separately.

```bash
git clone https://github.com/3-1-ChoiInSawMan/gesture_client.git gesture-client
cd gesture-client
npm ci
```

Copy `.env.example` to `.env.local` and configure the BFF address.

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1
BACKEND_URL=http://localhost:8080
NEXT_PUBLIC_WEBRTC_CONNECTION_MODE=proxy
NEXT_PUBLIC_WEBRTC_SOCKET_PATH=/socket.io
```

```bash
npm run dev
```

Open [localhost:3000](http://localhost:3000). Replace both backend URLs above when using a remote BFF.

### Environment variables

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | REST URL for local HTTP development, including `/api/v1` |
| `BACKEND_URL` | Target for the Next server's REST and Socket.IO proxy, without `/api/v1` |
| `NEXT_PUBLIC_WEBRTC_CONNECTION_MODE` | Defaults to `proxy`; use `direct` to connect to the BFF directly |
| `NEXT_PUBLIC_WEBRTC_WS_URL` | Socket URL for `direct` mode, including `/calls` |
| `NEXT_PUBLIC_WEBRTC_SOCKET_PATH` | Socket path for direct connections; defaults to `/socket.io` |

- HTTPS pages use the `/api/v1` proxy for REST requests.
- Direct socket connections require server-side Socket.IO CORS configuration. Use a secure endpoint for HTTPS pages.
- Restart the development server after changing environment variables. Public environment changes require a new deployment build.

## Usage

1. Register, verify your email, and log in.
2. Create a room or join an existing room from the call room list.
3. Allow camera and microphone access, then enable the devices you need.
4. Enable captions to display translation results. The hand detection indicator reports browser-side detection, not a completed translation.
5. Use screen sharing, chat, or meeting notes as needed.
6. Use the leave button to exit. Hosts request room deletion; failures are displayed.

## Commands

| Command | Description |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Create a production build and check types |
| `npm start` | Run the built application |
| `npm run lint` | Run ESLint |
| `npm run test:sfu` | Run SFU session and socket configuration regression tests |

## Deployment and testing

- Camera and microphone access require HTTPS or localhost.
- Set `BACKEND_URL` in the deployment environment. The default socket connection uses HTTP polling through the Next proxy.
- Audio/video media flows directly between the browser and the SFU. The backend also needs a reachable public IP and open media ports.
- One-to-one audio/video and camera toggling have been manually verified by users. Multi-party calls and mobile compatibility need further validation.
- Automated tests do not replace real camera, network, or AI recognition tests.

See the [SFU integration notes](docs/sfu-integration.md) (Korean) for connection details and backend checks.
