import test from 'node:test';
import assert from 'node:assert/strict';
import {createSignFrame} from '../src/components/videoroom/signFrame.ts';
const hand=(x)=>Array.from({length:21},()=>({x,y:0.7,z:99}));
const pose=Array.from({length:13},()=>({x:0.5,y:0.2}));pose[11].x=0.3;pose[12].x=0.7;
const frame=(left,right,p=pose)=>createSignFrame({leftHandLandmarks:left,rightHandLandmarks:right,poseLandmarks:p});
test('two hands sorted by mean x, unmirrored shoulders, 88 xy values',()=>{
 const f=frame(hand(0.8),hand(0.2));assert.equal(f.length,88);
 assert.deepEqual(f.slice(0,42),Array(21).fill([0.2,0.7]).flat());
 assert.deepEqual(f.slice(42,84),Array(21).fill([0.8,0.7]).flat());
 assert.deepEqual(f.slice(84),[0.3,0.2,0.7,0.2]);
});
test('single hand slots use shoulder center, independent of anatomical label',()=>{
 for(const x of [0.2,0.5,0.8])for(const side of [0,1]){
  const f=side?frame(undefined,hand(x)):frame(hand(x),undefined);
  assert.deepEqual(f.slice(x<0.5?42:0,x<0.5?84:42),Array(42).fill(0));
  assert.equal(f[x<0.5?0:42],x);
 }
});
test('missing and malformed hands zero filled; missing shoulders cannot classify a single hand',()=>{
 assert.deepEqual(frame().slice(0,84),Array(84).fill(0));
 assert.equal(frame(hand(0.2).slice(0,20)).length,88);
 assert.deepEqual(frame(hand(0.2),undefined,[]),Array(88).fill(0));
});
test('crossing hands swap anatomical slots and use mean rather than wrist x',()=>{
 const a=hand(0.2),b=hand(0.8);a[0].x=0.9;b[0].x=0.1;
 assert.equal(frame(a,b)[0],0.9);
 assert.equal(frame(hand(0.8),hand(0.2))[0],0.2);
});
