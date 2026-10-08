// Node.jsのstream入口を読み込まず、依存を持たない復号モジュールだけを使う。
import AisBitField from 'ais-stream-decoder/dist/ais-bitfield';
import AisMessage123 from 'ais-stream-decoder/dist/messages/ais-message-123';
import AisMessage18 from 'ais-stream-decoder/dist/messages/ais-message-18';
import AisMessage24 from 'ais-stream-decoder/dist/messages/ais-message-24';
import AisMessage5 from 'ais-stream-decoder/dist/messages/ais-message-5';

export const decodeAisPayload = (payload: string, fill: number, channel: string) => {
	const bitField = new AisBitField(payload);
	const length = payload.length * 6 - fill;
	if (length < 38) throw new Error('AISペイロードが短すぎます');
	if (fill && bitField.getInt(length, fill) !== 0) throw new Error('埋め草ビットが不正です');
	const type = bitField.getInt(0, 6);
	const part = type === 24 ? bitField.getInt(38, 2) : 0;
	const expected = type === 5 ? 424 : type === 24 && part === 0 ? 160 : 168;
	if (![1, 2, 3, 5, 18, 24].includes(type)) return null;
	if (length !== expected) throw new Error('AISペイロードのビット数が一致しません');
	if (type === 5) return new AisMessage5(type, channel, bitField);
	if (type === 24) return new AisMessage24(type, channel, bitField);
	if (type === 18) return new AisMessage18(type, channel, bitField);
	return new AisMessage123(type, channel, bitField);
};
