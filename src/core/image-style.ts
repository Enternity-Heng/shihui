import type {ImageStyle} from '../shared/types';
export const DEFAULT_IMAGE_STYLE:ImageStyle={fontSize:26,foreground:'#111111',background:'#ffffff',padding:24,scale:2};
export function validateImageStyle(value:unknown):ImageStyle{
  if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('图片样式格式无效。');
  const v=value as ImageStyle;
  if(!Number.isInteger(v.fontSize)||v.fontSize<12||v.fontSize>72||!Number.isInteger(v.padding)||v.padding<0||v.padding>96||![1,2,3,4].includes(v.scale)||typeof v.foreground!=='string'||!/^#[0-9a-f]{6}$/i.test(v.foreground)||typeof v.background!=='string'||(v.background!=='transparent'&&!/^#[0-9a-f]{6}$/i.test(v.background)))throw new Error('字号范围 12～72，留白 0～96，倍率 1～4，颜色必须为六位十六进制值。');
  return {fontSize:v.fontSize,foreground:v.foreground.toLowerCase(),background:v.background.toLowerCase(),padding:v.padding,scale:v.scale};
}
