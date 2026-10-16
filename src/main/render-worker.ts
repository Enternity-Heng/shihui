import { parentPort } from 'node:worker_threads';
import { convert } from '../core/converter';
import {renderPseudocode} from '../core/pseudocode';
parentPort?.on('message', (input:string|{kind:'pseudocode';source:string;lineNumbers:boolean}) => {
  if(typeof input==='string')parentPort?.postMessage(convert(input));
  else try{parentPort?.postMessage(renderPseudocode(input.source,input.lineNumbers));}
  catch(error){parentPort?.postMessage({html:'',errors:[{line:0,message:error instanceof Error?error.message:String(error)}],lines:0});}
});
