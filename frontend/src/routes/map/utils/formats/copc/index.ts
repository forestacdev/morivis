import { Copc } from 'copc';

// COPCファイルを開く
const copc = await Copc.create('https://example.com/data.copc.laz');

console.log(copc);
