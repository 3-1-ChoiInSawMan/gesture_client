import test from 'node:test';
import assert from 'node:assert/strict';
import { encodeSpeechCaption, createSpeechCaptionReceiver } from '../src/components/videoroom/speechCaptionRelay.ts';

test('A and B exchange captions without interpreting regular chat as subtitles', () => {
  const a = createSpeechCaptionReceiver(), b = createSpeechCaptionReceiver();
  assert.deepEqual(b(encodeSpeechCaption('안녕하세요', 'a')[0], 1), {handled:true, text:'안녕하세요'});
  assert.deepEqual(a(encodeSpeechCaption('반갑습니다', 'b')[0], 2), {handled:true, text:'반갑습니다'});
  assert.deepEqual(a('일반 채팅', 2), {handled:false});
});
test('long escaped Unicode text fits DTO, reassembles out of order and suppresses duplicates', () => {
  const text = ('안녕😀\n"\\\u0000').repeat(500);
  const packets = encodeSpeechCaption(text, '8f04c11b-3490-482d-8e9b-e7b0b8bb9250');
  assert.ok(packets.every(p=>p.length<=1000));
  const receive = createSpeechCaptionReceiver();
  const results = packets.toReversed().map(p=>receive(p, 7, 100));
  assert.equal(results.at(-1).text,text);
  assert.ok(packets.every(p=>receive(p,7,101).text===undefined));
  assert.equal(packets.map(p=>receive(p,8,102)).at(-1).text,text);
});
test('invalid envelopes stay out of chat and incomplete captions expire', () => {
  const receive = createSpeechCaptionReceiver();
  assert.deepEqual(receive('[gesture:stt:v1]{bad',1),{handled:true});
  const parts=encodeSpeechCaption('a'.repeat(121),'id');
  receive(parts[0],1,0);
  assert.equal(receive(parts[1],1,16000).text,undefined);
  assert.equal(createSpeechCaptionReceiver()(parts[1],1,16000).text,undefined);
});
