import test from 'node:test';
import assert from 'node:assert/strict';
import {checkImageSize,cropAndPad,grayscaleBGRA,decodeTokens} from '../src/core/ocr';
test('识别前拒绝过大和无效图片，限制解码内存',()=>{
  for(const size of [[0,20],[9000,2],[5000,5000],[1.5,20]])assert.throws(()=>checkImageSize(...size as [number,number]));
  assert.doesNotThrow(()=>checkImageSize(1000,1000));
});
test('空白图片不交给生成模型臆测',()=>{
  for(const shade of [0,127,255])assert.throws(()=>cropAndPad({width:32,height:32,pixels:new Uint8Array(1024).fill(shade)}),/没有可辨认/);
});
test('透明背景合成白底，黑底白字归一化为白底黑字',()=>{
  const bitmap=new Uint8Array(32*32*4);bitmap.set([0,0,0,255],(10*32+10)*4);
  const gray=grayscaleBGRA(bitmap,32,32);assert.equal(gray.pixels[0],255);assert.equal(gray.pixels[330],0);
  const inverse=new Uint8Array(32*32);inverse[330]=255;
  const padded=cropAndPad({width:32,height:32,pixels:inverse});assert.equal(padded.pixels[0],0);assert.equal(padded.width,32);
});
test('解码保留 LaTeX 控制词之间的空格，不拼接命令边界',()=>{
  assert.equal(decodeTokens([1,3,4,5,2],{'[BOS]':1,'[EOS]':2,'\\alpha':3,'Ġ':4,'x':5}),'\\alpha x');
  assert.throws(()=>decodeTokens([1,99,2],{'x':3}),/未知字符/);
  assert.throws(()=>decodeTokens([1,2],{}),/有效 LaTeX/);
});
