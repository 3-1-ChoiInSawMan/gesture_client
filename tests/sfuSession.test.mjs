import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { SfuSession } from "../src/components/videoroom/sfuSession.ts";

globalThis.MediaStream = class {
  constructor(tracks = []) { this.tracks = tracks; }
  getTracks() { return this.tracks; }
  getAudioTracks() { return this.tracks.filter((track) => track.kind === "audio"); }
  getVideoTracks() { return this.tracks.filter((track) => track.kind === "video"); }
};
const tick = () => new Promise((resolve) => setImmediate(resolve));
const flush = async () => { for (let i = 0; i < 10; i++) await tick(); };
const peer = { socketId: "peer", userIdx: 2, nickname: "참가자" };
const remote = (tag = "camera") => ({ producerId: `remote-${tag}`, peerId: "peer", kind: tag === "audio" ? "audio" : "video", mediaTag: tag, paused: false });
const track = (id, kind = "video") => ({ id, kind, readyState: "live", stop() { this.readyState = "ended"; } });

class Resource extends EventEmitter {
  constructor(options) { super(); Object.assign(this, options); this.closed = false; }
  close() { this.closed = true; }
  pause() { this.paused = true; }
  resume() { this.paused = false; }
  async replaceTrack({ track }) { this.track = track; }
}
class Transport extends Resource {
  constructor(id, log) { super({ id }); this.log = log; this.resources = []; }
  async connect() {
    if (this.connected) return;
    await new Promise((resolve, reject) => this.emit("connect", { dtlsParameters: { fingerprints: [] } }, resolve, reject));
    this.connected = true;
  }
  async produce(options) {
    await this.connect();
    const result = await new Promise((resolve, reject) => this.emit("produce", {
      kind: options.track.kind, rtpParameters: { codecs: [] }, appData: options.appData,
    }, resolve, reject));
    const producer = new Resource({ ...result, track: options.track, stopTracks: options.stopTracks });
    this.resources.push(producer);
    return producer;
  }
  async consume(options) {
    this.log.push("client-consume");
    await this.connect();
    const consumer = new Resource({ ...options, track: track(options.id, options.kind) });
    this.resources.push(consumer);
    return consumer;
  }
  async restartIce(options) { this.restarted = options; }
}
function setup(existing = [], timeoutMs = 100) {
  const incoming = new EventEmitter();
  const requests = [], log = [], overrides = new Map(), errors = [], captions = [];
  let participants = [];
  const socket = {
    id: "me", connected: true,
    on: (event, fn) => incoming.on(event, fn),
    off: (event, fn) => incoming.off(event, fn),
    emit(event, payload, ack) {
      requests.push({ event, payload }); log.push(event);
      if (overrides.has(event)) { overrides.get(event)(payload, ack); return; }
      let data = {};
      if (event === "join_call") data = { rtpCapabilities: { codecs: [] }, existingProducers: existing,
        state: { callRoomIdx: 7, participants: [{ socketId: "me", userIdx: 1, nickname: "나" }, peer] } };
      if (event === "create_transport") data = { id: payload.direction };
      if (event === "produce") data = { id: `local-${payload.mediaTag}` };
      if (event === "consume") {
        const producer = existing.find((item) => item.producerId === payload.producerId) ?? remote();
        data = { id: `consumer-${payload.producerId}`, producerId: payload.producerId,
          kind: producer.kind, peerId: producer.peerId, mediaTag: producer.mediaTag,
          rtpParameters: {}, producerPaused: producer.paused };
      }
      if (event.startsWith("send_")) data = { accepted: true };
      if (event === "leave_call") { incoming.emit("call_left", { callRoomIdx: 7 }); data = { coreSynced: true }; }
      if (event === "restart_ice") data = { iceParameters: { usernameFragment: "new" } };
      queueMicrotask(() => ack({ ok: true, data }));
    },
  };
  const send = new Transport("send", log), recv = new Transport("recv", log);
  const device = { load: async () => {}, canProduce: () => true,
    recvRtpCapabilities: { codecs: ["client-capabilities"] },
    createSendTransport: () => send, createRecvTransport: () => recv };
  const session = new SfuSession(socket, 7, {
    participants: (value) => { participants = value; }, caption: (...args) => captions.push(args),
    ended: (message) => errors.push(message), error: (error) => errors.push(error.message),
  }, async () => device, timeoutMs);
  return { session, socket, incoming, requests, overrides, log, errors, captions, send, recv,
    participants: () => participants };
}

test("AI validation errors identify the event and leave media notifications active", async () => {
  const s = setup();
  await s.session.start();
  s.overrides.set("send_frame", (_payload, ack) => ack({ ok: false, error: {
    code: "CALL_REQUEST_FAILED", message: "Bad Request Exception",
  } }));
  await assert.rejects(s.session.sendAi("frame", [[1, 2]]),
    /send_frame: CALL_REQUEST_FAILED: Bad Request Exception/);
  s.incoming.emit("new_producer", remote());
  await flush();
  assert.equal(s.participants()[0].isCameraOff, false);
  s.incoming.emit("producer_closed", { producerId: remote().producerId });
  assert.equal(s.participants()[0].isCameraOff, true);
  assert.deepEqual(s.errors, []);
  s.session.close();
});

test("queued/duplicate producers consume once; resume follows local consume and connect", async () => {
  const s = setup([remote()]);
  s.incoming.emit("new_producer", remote());
  await s.session.start(); await flush();
  s.incoming.emit("new_producer", remote()); await flush();
  assert.equal(s.requests.filter((request) => request.event === "consume").length, 1);
  assert.ok(s.log.indexOf("consume") < s.log.indexOf("client-consume"));
  assert.ok(s.log.indexOf("client-consume") < s.log.indexOf("connect_transport"));
  assert.ok(s.log.indexOf("connect_transport") < s.log.indexOf("resume_consumer"));
  assert.deepEqual(s.requests.find((request) => request.event === "consume").payload.rtpCapabilities, { codecs: ["client-capabilities"] });
  assert.equal(s.participants()[0].isCameraOff, false);
  s.session.close();
});

test("audio/camera/screen are mapped by mediaTag; pause/resume and removal update UI", async () => {
  const s = setup([remote("audio"), remote(), remote("screen")]);
  await s.session.start(); await flush();
  const p = s.participants()[0];
  assert.equal(p.stream.getTracks().length, 2);
  assert.equal(p.screenStream.getVideoTracks().length, 1);
  assert.equal(p.isMuted, false); assert.equal(p.isScreenSharing, true);
  s.incoming.emit("producer_paused", { producerId: "remote-camera" });
  assert.equal(s.participants()[0].isCameraOff, true);
  assert.equal(s.participants()[0].stream, p.stream, "unchanged tracks keep stream identity");
  s.incoming.emit("producer_resumed", { producerId: "remote-camera" });
  assert.equal(s.participants()[0].isCameraOff, false);
  s.incoming.emit("producer_closed", { producerId: "remote-screen" });
  assert.equal(s.participants()[0].isScreenSharing, false);
  s.incoming.emit("user_left", { ...peer, callRoomIdx: 7 });
  assert.equal(s.participants().length, 0);
  s.session.close();
});

test("producer closed during consume is never resurrected by a late ACK", async () => {
  const s = setup([remote()]); let acknowledge;
  s.overrides.set("consume", (_payload, ack) => { acknowledge = ack; });
  await s.session.start(); await flush();
  s.incoming.emit("producer_closed", { producerId: "remote-camera" });
  acknowledge({ ok: true, data: { id: "late", producerId: "remote-camera", kind: "video", rtpParameters: {} } });
  await flush();
  assert.equal(s.recv.resources.length, 0);
  assert.ok(s.requests.some((r) => r.event === "close_consumer"));
  assert.equal(s.participants()[0].isCameraOff, true);
  s.session.close();
});

test("rapid track toggles serialize producer closure before replacement and preserve owned tracks", async () => {
  const s = setup(); const first = track("first"), second = track("second");
  s.session.setTrack("camera", first);
  await s.session.start(); await flush();
  let acknowledge;
  s.overrides.set("close_producer", (_payload, ack) => { acknowledge = ack; });
  s.session.setTrack("camera", null);
  s.session.setTrack("camera", second);
  await flush();
  assert.equal(s.requests.filter((r) => r.event === "produce").length, 1);
  acknowledge({ ok: true, data: { closed: true } }); await flush();
  assert.equal(s.requests.filter((r) => r.event === "produce").length, 2);
  assert.deepEqual(Object.keys(s.requests.find((r) => r.event === "produce").payload).sort(), ["kind", "mediaTag", "rtpParameters", "transportId"]);
  assert.equal(s.send.resources[1].track, second);
  assert.equal(s.send.resources[0].stopTracks, false);
  s.session.close();
  assert.equal(second.readyState, "live");
});

test("room captions are received without a local detector, with no rebroadcast", async () => {
  const s = setup(); await s.session.start();
  s.incoming.emit("frame_translation", { callRoomIdx: 7, text: "안녕하세요" });
  s.incoming.emit("audio_translation", { callRoomIdx: 7, text: "반갑습니다" });
  s.incoming.emit("audio_translation", { callRoomIdx: 8, text: "다른 방" });
  assert.deepEqual(s.captions, [["frame", "안녕하세요"], ["audio", "반갑습니다"]]);
  assert.equal(s.requests.some((r) => /caption|translation/.test(r.event)), false);
  const audio = new ArrayBuffer(4);
  assert.equal(await s.session.sendAi("audio", audio), true);
  assert.equal(s.requests.find((r) => r.event === "send_audio").payload.audio, audio);
  s.session.close();
});

test("ACK errors/timeouts reject; close cancels pending requests and listeners", async () => {
  const s = setup();
  s.overrides.set("join_call", (_p, ack) => ack({ ok: false, error: { code: "CALL_FORBIDDEN", message: "denied" } }));
  await assert.rejects(s.session.start(), /CALL_FORBIDDEN/); s.session.close();
  const timeout = setup([], 10); timeout.overrides.set("join_call", () => {});
  await assert.rejects(timeout.session.start(), /초과/); timeout.session.close();
  const pending = setup(); pending.overrides.set("join_call", () => {});
  const starting = pending.session.start(); pending.session.close();
  await assert.rejects(starting, /종료/);
  assert.equal(pending.incoming.eventNames().length, 0);
});

test("leave handles call_left without reporting failure; false Core sync asks caller for fallback", async () => {
  const s = setup(); await s.session.start();
  assert.equal(await s.session.leave(), true);
  assert.equal(s.send.closed, true); assert.equal(s.recv.closed, true);
  assert.deepEqual(s.errors, []);
  const fallback = setup(); await fallback.session.start();
  fallback.overrides.set("leave_call", (_p, ack) => ack({ ok: true, data: { coreSynced: false } }));
  assert.equal(await fallback.session.leave(), false);
});

test("failed transport requests ICE restart and applies returned parameters", async () => {
  const s = setup(); await s.session.start();
  s.send.emit("connectionstatechange", "failed"); await flush();
  assert.deepEqual(s.send.restarted, { iceParameters: { usernameFragment: "new" } });
  s.session.close();
});

test("newer call_state notifications win over the join snapshot", async () => {
  const s = setup(); let acknowledge;
  s.overrides.set("join_call", (_p, ack) => { acknowledge = ack; });
  const starting = s.session.start();
  s.incoming.emit("call_state", { callRoomIdx: 7, participants: [] });
  acknowledge({ ok: true, data: { rtpCapabilities: {}, existingProducers: [],
    state: { callRoomIdx: 7, participants: [peer] } } });
  await starting;
  assert.deepEqual(s.participants(), []);
  s.session.close();
});

test("normal leave tolerates transport_closed before the leave ACK", async () => {
  const s = setup(); await s.session.start();
  s.overrides.set("leave_call", (_p, ack) => {
    s.incoming.emit("transport_closed", { transportId: "send" });
    s.incoming.emit("transport_closed", { transportId: "recv" });
    s.incoming.emit("call_left", { callRoomIdx: 7 });
    ack({ ok: true, data: { coreSynced: true } });
  });
  assert.equal(await s.session.leave(), true);
  assert.deepEqual(s.errors, []);
});

test("AI requests do not buffer through disconnect and respect ACK backpressure", async () => {
  const s = setup(); await s.session.start(); let acknowledge;
  s.overrides.set("send_audio", (_p, ack) => { acknowledge = ack; });
  const pending = s.session.sendAi("audio", new ArrayBuffer(4));
  assert.equal(await s.session.sendAi("audio", new ArrayBuffer(4)), null);
  acknowledge({ ok: true, data: { accepted: false } });
  assert.equal(await pending, false);
  s.session.close(); s.socket.connected = false;
  assert.equal(await s.session.sendAi("audio", new ArrayBuffer(4)), null);
  assert.equal(s.requests.filter((request) => request.event === "send_audio").length, 1);
});

test('frame batch is skipped while the previous frame ACK is pending',async()=>{
 const s=setup();await s.session.start();let ack;
 s.overrides.set('send_frame',(_p,cb)=>{ack=cb;});
 const first=s.session.sendAi('frame',Array.from({length:30},()=>Array(88).fill(0)));
 assert.equal(await s.session.sendAi('frame',Array.from({length:30},()=>Array(88).fill(1))),null);
 assert.equal(s.requests.filter(r=>r.event==='send_frame').length,1);
 ack({ok:true,data:{accepted:true}});assert.equal(await first,true);s.session.close();
});
