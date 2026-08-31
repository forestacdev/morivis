import { describe, expect, it } from 'vitest';

import { parseFbxModelAttributes } from './fbx-attributes';

describe('parseFbxModelAttributes', () => {
	const encodeString = (value: string) => {
		const bytes = new TextEncoder().encode(value);
		const output = new Uint8Array(5 + bytes.length);
		output[0] = 'S'.charCodeAt(0);
		new DataView(output.buffer).setUint32(1, bytes.length, true);
		output.set(bytes, 5);
		return output;
	};

	const encodeId = (value: number) => {
		const output = new Uint8Array(9);
		output[0] = 'L'.charCodeAt(0);
		new DataView(output.buffer).setBigInt64(1, BigInt(value), true);
		return output;
	};

	const joinBytes = (parts: Uint8Array[]) => {
		const output = new Uint8Array(parts.reduce((length, part) => length + part.length, 0));
		let offset = 0;
		parts.forEach((part) => {
			output.set(part, offset);
			offset += part.length;
		});
		return output;
	};

	const createNode = (
		name: string,
		properties: Uint8Array[],
		children: ((offset: number) => Uint8Array)[],
		offset: number
	) => {
		const encodedName = new TextEncoder().encode(name);
		const encodedProperties = joinBytes(properties);
		let childOffset = offset + 25 + encodedName.length + encodedProperties.length;
		const encodedChildren = children.map((child) => {
			const result = child(childOffset);
			childOffset += result.length;
			return result;
		});
		const output = new Uint8Array(childOffset + 25 - offset);
		const view = new DataView(output.buffer);
		view.setBigUint64(0, BigInt(offset + output.length), true);
		view.setBigUint64(8, BigInt(properties.length), true);
		view.setBigUint64(16, BigInt(encodedProperties.length), true);
		view.setUint8(24, encodedName.length);
		output.set(encodedName, 25);
		output.set(encodedProperties, 25 + encodedName.length);
		let targetOffset = 25 + encodedName.length + encodedProperties.length;
		encodedChildren.forEach((child) => {
			output.set(child, targetOffset);
			targetOffset += child.length;
		});
		return output;
	};

	it('最小FBX fixtureからモデル属性を抽出できる', () => {
		const header = new Uint8Array(27);
		header.set(new TextEncoder().encode('Kaydara FBX Binary  '));
		header.set([0, 0x1a, 0], 20);
		new DataView(header.buffer).setUint32(23, 7700, true);
		const modelId = 1001;
		const model = createNode(
			'Model',
			[encodeId(modelId), encodeString('PLANESURFACE'), encodeString('Mesh')],
			[(propertiesOffset) => createNode('Properties70', [], [
				(propertyOffset) => createNode('P', [
					encodeString('項目 - GUID'), encodeString('KString'), encodeString(''),
					encodeString('U'), encodeString('fixture-guid')
				], [], propertyOffset)
			], propertiesOffset)],
			27
		);
		const attributes = parseFbxModelAttributes(joinBytes([header, model, new Uint8Array(25)]).buffer);

		expect(attributes[String(modelId)]?.['項目 - GUID']).toBe('fixture-guid');
	});
});
