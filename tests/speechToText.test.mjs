import test from 'node:test';
import assert from 'node:assert/strict';
import { extractTranscript, startSttRecorder } from '../src/components/videoroom/useSpeechToText.ts';

test('encoded chunks, reconnect, backpressure and shared track cleanup', () => {
 const original=globalThis.MediaRecorder;
 const recorders=[];
 class Recorder {
  static isTypeSupported(type){return type==='audio/webm;codecs=opus';}
  state='inactive';
  constructor(stream,options){this.options=options;recorders.push(this);}
  start(interval){this.interval=interval;this.state='recording';}
  stop(){this.state='inactive';}
 }
 globalThis.MediaRecorder=Recorder;
 try {
  const sent=[];let closed=0;
  const socket={readyState:1,bufferedAmount:0,send:data=>sent.push(data),close:()=>closed++};
  const stream={getTracks:()=>[{stop:()=>assert.fail('shared track stopped')}]};
  const stop=startSttRecorder(stream,socket);
  const first=recorders[0];
  assert.equal(first.options.mimeType,'audio/webm;codecs=opus');
  assert.equal(first.interval,1000);
  const header=new Blob(['header']); const chunk=new Blob(['chunk']);
  first.ondataavailable({data:header}); first.ondataavailable({data:chunk});
  first.ondataavailable({data:new Blob([])});
  assert.deepEqual(sent,[header,chunk]);
  const late=first.ondataavailable;
  stop();stop();late({data:chunk});
  assert.equal(sent.length,2);assert.equal(first.state,'inactive');
  const stopSecond=startSttRecorder(stream,socket);
  assert.notEqual(recorders[1],first);
  socket.bufferedAmount=2*1024*1024;
  recorders[1].ondataavailable({data:chunk});
  assert.equal(closed,1);assert.equal(sent.length,2);
  assert.equal(recorders[1].state,'inactive');stopSecond();
 } finally { if(original===undefined)delete globalThis.MediaRecorder;else globalThis.MediaRecorder=original; }
});
test('plain and JSON transcripts ignore control messages',()=>{
 for(const raw of ['hello','"hello"','{"text":"hello"}','{"transcript":"hello"}','{"result":"hello"}'])assert.equal(extractTranscript(raw),'hello');
 for(const raw of ['', '{"event":"ping"}', '{"result":null}', '42','null'])assert.equal(extractTranscript(raw),'');
});
