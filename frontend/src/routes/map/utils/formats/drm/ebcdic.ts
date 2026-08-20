export const EBCDIC_SPACE = 0x40

const EBCDIC_ZERO = 0xf0
const EBCDIC_NINE = 0xf9

const blockOf = (start: number, chars: string): [number, string][] =>
	[...chars].map((char, index) => [start + index, char])

const SINGLE_BYTE: ReadonlyMap<number, string> = new Map([
	[0x40, ' '],
	[0x4b, '.'],
	[0x4c, '<'],
	[0x4d, '('],
	[0x4e, '+'],
	[0x50, '&'],
	[0x5c, '*'],
	[0x5d, ')'],
	[0x5e, ';'],
	[0x60, '-'],
	[0x61, '/'],
	[0x6b, ','],
	[0x6c, '%'],
	[0x6d, '_'],
	[0x6e, '>'],
	[0x6f, '?'],
	[0x7a, ':'],
	[0x7d, "'"],
	[0x7e, '='],
	[0x7f, '"'],
	...blockOf(0x81, 'abcdefghi'),
	...blockOf(0x91, 'jklmnopqr'),
	...blockOf(0xa2, 'stuvwxyz'),
	...blockOf(0xc1, 'ABCDEFGHI'),
	...blockOf(0xd1, 'JKLMNOPQR'),
	...blockOf(0xe2, 'STUVWXYZ'),
	...blockOf(0xf0, '0123456789')
])

export const decodeEbcdic = (bytes: Uint8Array): string => {
	let output = ''

	for (const byte of bytes) {
		output += SINGLE_BYTE.get(byte) ?? '�'
	}

	return output
}

export const readInt = (
	bytes: Uint8Array,
	start: number,
	length: number
): number | null => {
	let value = 0
	let digits = 0

	for (let index = start - 1; index < start - 1 + length; index += 1) {
		const byte = bytes[index]
		if (byte === undefined) return null

		if (byte >= EBCDIC_ZERO && byte <= EBCDIC_NINE) {
			value = value * 10 + (byte - EBCDIC_ZERO)
			digits += 1
			continue
		}

		if (byte === EBCDIC_SPACE) continue
		return null
	}

	return digits > 0 ? value : null
}

export const readText = (bytes: Uint8Array, start: number, length: number): string =>
	decodeEbcdic(bytes.subarray(start - 1, start - 1 + length)).trim()
