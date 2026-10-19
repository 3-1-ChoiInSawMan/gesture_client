import { Device, type types as Media } from "mediasoup-client";
import type { Socket } from "socket.io-client";
import type { Participant } from "./types";

export type MediaTag = "audio" | "camera" | "screen";
type Peer = { socketId: string; userIdx: number; nickname: string };
type CallState = { callRoomIdx: number; participants: Peer[] };
type RemoteProducer = {
  producerId: string; peerId: string; kind: Media.MediaKind;
  mediaTag: MediaTag; paused: boolean;
};
type JoinResult = {
  rtpCapabilities: Media.RtpCapabilities;
  existingProducers: RemoteProducer[];
  state: CallState;
};
type ConsumerResult = Media.ConsumerOptions & {
  peerId: string; mediaTag: MediaTag; producerPaused: boolean;
};
type Ack<T> = { ok: true; data: T } | { ok: false; error: { code: string; message: string } };
type Callbacks = {
  participants: (participants: Participant[]) => void;
  caption: (source: "frame" | "audio", text: string) => void;
  ended: (message: string) => void;
  error: (error: Error) => void;
};

/** One Socket.IO connection's SFU resources. Never reuse after a disconnect. */
export class SfuSession {
  private readonly socket: Socket;
  private readonly roomIdx: number;
  private readonly callbacks: Callbacks;
  private readonly makeDevice: () => Promise<Device>;
  private readonly timeoutMs: number;
  private device?: Device;
  private send?: Media.Transport;
  private recv?: Media.Transport;
  private closed = false;
  private ready = false;
  private leaving = false;
  private receivedState = false;
  private listeners: Array<[string, (data: unknown) => void]> = [];
  private streams = new Map<string, MediaStream>();
  private cancellations = new Set<(error: Error) => void>();
  private peers = new Map<string, Peer>();
  private remote = new Map<string, RemoteProducer>();
  private consumers = new Map<string, Media.Consumer>();
  private consuming = new Set<string>();
  private removed = new Set<string>();
  private producers = new Map<MediaTag, Media.Producer>();
  private desired = new Map<MediaTag, MediaStreamTrack | null>();
  private publishing = new Map<MediaTag, Promise<void>>();
  private restarting = new Set<string>();
  private aiPending = new Set<string>();

  constructor(socket: Socket, roomIdx: number, callbacks: Callbacks,
    makeDevice: () => Promise<Device> = () => Device.factory(), timeoutMs = 10000) {
    this.socket = socket;
    this.roomIdx = roomIdx;
    this.callbacks = callbacks;
    this.makeDevice = makeDevice;
    this.timeoutMs = timeoutMs;
    // Subscribe before join_call: notifications can arrive before its ACK.
    this.on("existing_participants", (data: CallState) => {
      if (data.callRoomIdx !== roomIdx) return;
      data.participants.forEach((peer) => this.peers.set(peer.socketId, peer));
      this.render();
    });
    this.on("call_state", (data: CallState) => {
      if (data.callRoomIdx !== roomIdx) return;
      this.receivedState = true;
      this.setState(data);
    });
    this.on("user_joined", (peer: Peer & { callRoomIdx: number }) => {
      if (peer.callRoomIdx !== roomIdx) return;
      this.peers.set(peer.socketId, peer);
      this.render();
    });
    this.on("user_left", (peer: Peer & { callRoomIdx: number }) => {
      if (peer.callRoomIdx !== roomIdx) return;
      this.removePeer(peer.socketId);
      this.render();
    });
    this.on("new_producer", (producer: RemoteProducer) => this.addRemote(producer));
    this.on("producer_closed", (data: { producerId: string }) => this.removeRemote(data.producerId));
    this.on("consumer_closed", (data: { producerId: string }) => this.removeRemote(data.producerId));
    for (const [event, paused] of [["producer_paused", true], ["producer_resumed", false]] as const) {
      this.on(event, (data: { producerId: string }) => {
        const remote = this.remote.get(data.producerId);
        if (remote) remote.paused = paused;
        const consumer = this.consumers.get(data.producerId);
        if (paused) consumer?.pause(); else consumer?.resume();
        this.render();
      });
    }
    this.on("transport_closed", (data: { transportId: string }) => {
      if (this.leaving) return;
      if (data.transportId === this.send?.id || data.transportId === this.recv?.id)
        this.fail(new Error("미디어 연결이 종료되었습니다. 다시 연결해 주세요."));
    });
    this.on("call_left", () => {
      if (!this.leaving) this.end("통화 세션이 종료되었습니다. 다른 기기에서 입장했거나 방이 종료되었을 수 있습니다.");
    });
    this.on("media_room_closed", () => this.end("미디어 서버의 통화 세션이 종료되었습니다. 다시 연결해 주세요."));
    this.on("room_deleted", () => this.end("통화방이 삭제되었습니다."));
    for (const source of ["frame", "audio"] as const) {
      this.on(`${source}_translation`, (data: { callRoomIdx: number; text: string }) => {
        if (data.callRoomIdx === roomIdx && typeof data.text === "string" && data.text.trim())
          this.callbacks.caption(source, data.text);
      });
    }
  }

  private on<T>(event: string, listener: (data: T) => void) {
    const handler = (data: unknown) => listener(data as T);
    this.socket.on(event, handler);
    this.listeners.push([event, handler]);
  }

  private request<T>(event: string, payload: object = {}): Promise<T> {
    if (this.closed || !this.socket.connected) return Promise.reject(new Error("통화 연결이 끊겼습니다."));
    return new Promise<T>((resolve, reject) => {
      const finish = (error?: Error, data?: T) => {
        clearTimeout(timer);
        this.cancellations.delete(cancel);
        if (error) reject(error); else resolve(data as T);
      };
      const cancel = (error: Error) => finish(error);
      const timer = setTimeout(() => finish(new Error(`${event}: 서버 응답 시간이 초과되었습니다.`)), this.timeoutMs);
      this.cancellations.add(cancel);
      this.socket.emit(event, payload, (ack: Ack<T>) => {
        if (!this.cancellations.has(cancel)) return;
        if (ack?.ok === true) finish(undefined, ack.data);
        else finish(new Error(ack?.ok === false ? `${event}: ${ack.error.code}: ${ack.error.message}` : `${event}: 잘못된 서버 응답`));
      });
    });
  }

  async start(): Promise<void> {
    const result = await this.request<JoinResult>("join_call", { callRoomIdx: this.roomIdx });
    this.assertOpen();
    if (!this.receivedState) this.setState(result.state);
    for (const producer of result.existingProducers) this.addRemote(producer);
    this.device = await this.makeDevice();
    this.assertOpen();
    await this.device.load({ routerRtpCapabilities: result.rtpCapabilities });
    this.assertOpen();
    const sendOptions = await this.request<Media.TransportOptions>("create_transport", { direction: "send" });
    this.assertOpen();
    this.send = this.device.createSendTransport(sendOptions);
    this.bindTransport(this.send);
    this.send.on("produce", ({ kind, rtpParameters, appData }, callback, errback) => {
      void this.request<{ id: string }>("produce", {
        transportId: this.send!.id, kind, rtpParameters, mediaTag: appData.mediaTag,
      }).then(callback, errback);
    });
    const recvOptions = await this.request<Media.TransportOptions>("create_transport", { direction: "recv" });
    this.assertOpen();
    this.recv = this.device.createRecvTransport(recvOptions);
    this.bindTransport(this.recv);
    this.ready = true;
    for (const producer of this.remote.values()) this.consume(producer.producerId);
    for (const tag of this.desired.keys()) this.schedulePublish(tag);
  }

  private assertOpen() {
    if (this.closed) throw new Error("통화 세션이 종료되었습니다.");
  }

  private bindTransport(transport: Media.Transport) {
    transport.on("connect", ({ dtlsParameters }, callback, errback) => {
      void this.request("connect_transport", { transportId: transport.id, dtlsParameters }).then(() => callback(), errback);
    });
    transport.on("connectionstatechange", (state) => {
      if (state !== "failed" || this.closed || this.restarting.has(transport.id)) return;
      this.restarting.add(transport.id);
      void this.request<{ iceParameters: Media.IceParameters }>("restart_ice", { transportId: transport.id })
        .then((result) => { this.assertOpen(); return transport.restartIce(result); })
        .catch((error: Error) => this.fail(error))
        .finally(() => this.restarting.delete(transport.id));
    });
  }

  setTrack(tag: MediaTag, track: MediaStreamTrack | null) {
    this.desired.set(tag, track);
    if (this.ready && !this.closed) this.schedulePublish(tag);
  }

  private schedulePublish(tag: MediaTag) {
    if (this.publishing.has(tag)) return;
    const task = this.publish(tag).catch((error: Error) => this.fail(error));
    this.publishing.set(tag, task);
    void task.finally(() => {
      this.publishing.delete(tag);
      const desired = this.desired.get(tag);
      const actual = this.producers.get(tag);
      if (!this.closed && (desired?.readyState === "live" ? actual?.track !== desired : !!actual))
        this.schedulePublish(tag);
    });
  }

  private async publish(tag: MediaTag) {
    const track = this.desired.get(tag);
    const existing = this.producers.get(tag);
    if (!track || track.readyState !== "live") {
      if (existing) {
        // Stop sending immediately, but wait for server removal before a replacement.
        existing.close();
        await this.request("close_producer", { producerId: existing.id });
        this.producers.delete(tag);
      }
      return;
    }
    if (existing && !existing.closed) {
      if (existing.track !== track) await existing.replaceTrack({ track });
      return;
    }
    if (!this.device!.canProduce(track.kind as Media.MediaKind)) throw new Error(`${tag}: 이 브라우저에서 송출할 수 없습니다.`);
    const producer = await this.send!.produce({ track, stopTracks: false, appData: { mediaTag: tag } });
    if (this.closed) { producer.close(); return; }
    this.producers.set(tag, producer);
    producer.on("trackended", () => {
      if (this.desired.get(tag) === producer.track) this.setTrack(tag, null);
    });
  }

  private addRemote(producer: RemoteProducer) {
    if (this.closed || producer.peerId === this.socket.id || this.removed.has(producer.producerId)) return;
    // Keep a pause/resume notification received after the initial snapshot.
    if (!this.remote.has(producer.producerId)) this.remote.set(producer.producerId, { ...producer });
    if (this.ready) this.consume(producer.producerId);
  }

  private consume(producerId: string) {
    if (this.consumers.has(producerId) || this.consuming.has(producerId)) return;
    this.consuming.add(producerId);
    void this.consumeRemote(producerId).catch((error: Error) => {
      if (!this.closed && !this.removed.has(producerId)) this.fail(error);
    }).finally(() => this.consuming.delete(producerId));
  }

  private async consumeRemote(producerId: string) {
    const result = await this.request<ConsumerResult>("consume", {
      transportId: this.recv!.id, producerId, rtpCapabilities: this.device!.recvRtpCapabilities,
    });
    if (this.closed) return;
    if (this.removed.has(producerId)) {
      await this.request("close_consumer", { consumerId: result.id });
      return;
    }
    const consumer = await this.recv!.consume(result);
    if (this.closed || this.removed.has(producerId)) { consumer.close(); return; }
    this.consumers.set(producerId, consumer);
    consumer.on("trackended", () => this.removeRemote(producerId));
    consumer.on("transportclose", () => this.removeRemote(producerId));
    await this.request("resume_consumer", { consumerId: consumer.id });
    if (this.closed || this.removed.has(producerId)) return;
    if (this.remote.get(producerId)?.paused ?? result.producerPaused) consumer.pause();
    this.render();
  }

  private removeRemote(producerId: string) {
    this.removed.add(producerId);
    this.remote.delete(producerId);
    this.consumers.get(producerId)?.close();
    this.consumers.delete(producerId);
    this.render();
  }

  private removePeer(peerId: string) {
    this.peers.delete(peerId);
    this.streams.delete(peerId);
    this.streams.delete(`${peerId}:screen`);
    for (const producer of this.remote.values()) {
      if (producer.peerId === peerId) this.removeRemote(producer.producerId);
    }
  }

  private setState(state: CallState) {
    if (state.callRoomIdx !== this.roomIdx) return;
    const ids = new Set(state.participants.map((peer) => peer.socketId));
    for (const id of this.peers.keys()) if (!ids.has(id)) this.removePeer(id);
    this.peers = new Map(state.participants.map((peer) => [peer.socketId, peer]));
    this.render();
  }

  private render() {
    if (this.closed) return;
    this.callbacks.participants(Array.from(this.peers.values())
      .filter((peer) => peer.socketId !== this.socket.id)
      .map((peer): Participant => {
        const tracks: MediaStreamTrack[] = [];
        const screen: MediaStreamTrack[] = [];
        let camera = false, audio = false, sharing = false;
        for (const [id, producer] of this.remote) {
          const consumer = this.consumers.get(id);
          if (producer.peerId !== peer.socketId || !consumer || consumer.closed) continue;
          if (producer.mediaTag === "screen") {
            screen.push(consumer.track);
            sharing = !producer.paused;
          } else {
            tracks.push(consumer.track);
            if (producer.mediaTag === "camera") camera = !producer.paused;
            if (producer.mediaTag === "audio") audio = !producer.paused;
          }
        }
        return { id: peer.socketId, userIdx: peer.userIdx, name: peer.nickname,
          username: String(peer.userIdx), isMuted: !audio, isCameraOff: !camera,
          isScreenSharing: sharing, stream: this.streamFor(peer.socketId, tracks),
          screenStream: this.streamFor(`${peer.socketId}:screen`, screen) };
      }));
  }

  private streamFor(key: string, tracks: MediaStreamTrack[]) {
    if (!tracks.length) { this.streams.delete(key); return undefined; }
    const existing = this.streams.get(key);
    const previous = existing?.getTracks();
    if (previous?.length === tracks.length && tracks.every((track) => previous.includes(track))) return existing;
    const stream = new MediaStream(tracks);
    this.streams.set(key, stream);
    return stream;
  }

  /** Backpressure: never buffer stale AI requests across disconnects or slow ACKs. */
  async sendAi(source: "frame" | "audio", content: number[][] | ArrayBuffer): Promise<boolean | null> {
    if (!this.ready || this.closed || this.aiPending.has(source)) return null;
    this.aiPending.add(source);
    try {
      const result = await this.request<{ accepted: boolean }>(`send_${source}`, {
        callRoomIdx: this.roomIdx, [source]: content,
      });
      return result.accepted;
    } finally { this.aiPending.delete(source); }
  }

  async leave(): Promise<boolean> {
    if (this.closed) return false;
    this.leaving = true;
    try {
      const result = await this.request<{ coreSynced?: boolean }>("leave_call", { callRoomIdx: this.roomIdx });
      return result.coreSynced !== false;
    } finally { this.close(); }
  }

  private fail(error: Error) {
    if (this.closed) return;
    this.close();
    this.callbacks.error(error);
  }

  private end(message: string) {
    if (this.closed) return;
    this.close();
    this.callbacks.ended(message);
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    this.ready = false;
    this.listeners.forEach(([event, listener]) => this.socket.off(event, listener));
    this.listeners = [];
    for (const cancel of this.cancellations) cancel(new Error("통화 세션이 종료되었습니다."));
    this.producers.forEach((producer) => producer.close());
    this.consumers.forEach((consumer) => consumer.close());
    this.send?.close();
    this.recv?.close();
    this.producers.clear();
    this.consumers.clear();
    this.remote.clear();
    this.peers.clear();
    this.streams.clear();
    this.callbacks.participants([]);
  }
}
