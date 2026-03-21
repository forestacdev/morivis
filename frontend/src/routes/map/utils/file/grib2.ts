// pure-grib2-parser.ts
//
// 参考仕様書:
// - NCEP GRIB2 Documentation: https://www.nco.ncep.noaa.gov/pmb/docs/grib2/grib2_doc/
// - Template 5.0 (Simple packing): https://www.nco.ncep.noaa.gov/pmb/docs/grib2/grib2_doc/grib2_temp5-0.shtml
// - Template 5.2 (Complex packing): https://www.nco.ncep.noaa.gov/pmb/docs/grib2/grib2_doc/grib2_temp5-2.shtml
// - Template 5.3 (Complex packing + spatial differencing): https://www.nco.ncep.noaa.gov/pmb/docs/grib2/grib2_doc/grib2_temp5-3.shtml
// - ECMWF Template 5.3: https://codes.ecmwf.int/grib/format/grib2/templates/5/3/
// - ECMWF Section 7 Template 3: https://codes.ecmwf.int/grib/format/grib2/templates/7/3/
// - Section 3 Template 0 (Regular lat/lon): https://www.nco.ncep.noaa.gov/pmb/docs/grib2/grib2_doc/grib2_temp3-0.shtml
//
// 参考実装:
// - grib2class (npm, pure JS): https://github.com/archmoj/grib2class
// - grib22json (JS decoder): https://github.com/BlueNetCat/grib22json
//
// TODO: Template 5.3 (Complex packing + spatial differencing) のアンパック処理を実装する
//       気象庁GPV (GSM) はこのテンプレートを使用している
//       Section 5 Template 5.3 のオクテット構造:
//         12-15: 参照値(R) IEEE 32bit float
//         16-17: 二進スケール係数(E)
//         18-19: 十進スケール係数(D)
//         20: ビット数
//         21: 元フィールド値の型
//         22: グループ分割方式
//         23: 欠損値管理方式
//         24-27: 主要欠損値代替値
//         28-31: 次要欠損値代替値
//         32-35: NG（データグループ数）
//         36: グループ幅の参照値
//         37: グループ幅用ビット数
//         38-41: グループ長の参照値
//         42: グループ長の長さ増分
//         43-46: 最後のグループの真の長さ
//         47: スケーリング後のグループ長用ビット数
//         48: 空間差分の次数 (1 or 2)
//         49: 空間差分記述子のオクテット数

interface GribSection {
	length: number;
	number: number;
	data: ArrayBuffer;
}

interface GribMetadata {
	discipline: number;
	edition: number;
	centre: number;
	parameterNumber: number;
	parameterName?: string;
	levelType: number;
	levelValue: number;
	referenceTime: Date;
	forecastTime: number;
	nx: number;
	ny: number;
	la1: number;
	lo1: number;
	la2: number;
	lo2: number;
	dx: number;
	dy: number;
}

interface GribRecord {
	metadata: GribMetadata;
	values: Float32Array;
	latlons(): { lats: Float32Array; lons: Float32Array };
}

export class PureGrib2Parser {
	private buffer: ArrayBuffer;
	private view: DataView;
	private position: number = 0;
	private readonly maxMessages: number = 1000; // 最大メッセージ数制限

	constructor(buffer: ArrayBuffer) {
		this.buffer = buffer;
		this.view = new DataView(buffer);
		this.position = 0;
	}

	parse(): GribRecord[] {
		const records: GribRecord[] = [];
		let messageCount = 0;

		console.log(`Starting to parse GRIB file, buffer size: ${this.buffer.byteLength} bytes`);

		// ファイル全体の最初の64バイトをダンプ（デバッグ用）
		const previewLength = Math.min(64, this.buffer.byteLength);
		const preview = new Uint8Array(this.buffer.slice(0, previewLength));
		console.log(
			'File preview (hex):',
			Array.from(preview)
				.map((b) => b.toString(16).padStart(2, '0'))
				.join(' ')
		);
		console.log(
			'File preview (ASCII):',
			Array.from(preview)
				.map((b) => (b >= 32 && b < 127 ? String.fromCharCode(b) : '.'))
				.join('')
		);

		// ファイル内のすべてのGRIBヘッダーを事前に検索
		const gribPositions = this.findAllGribHeaders();
		console.log(`Found ${gribPositions.length} GRIB headers at positions:`, gribPositions);

		// 各GRIBヘッダーでメッセージを解析
		for (let i = 0; i < gribPositions.length && messageCount < this.maxMessages; i++) {
			this.position = gribPositions[i];

			try {
				console.log(`Processing message ${messageCount + 1}, position: ${this.position}`);

				const record = this.parseMessage();
				if (record) {
					records.push(record);
					messageCount++;
				} else {
					console.log(`No record found at position ${this.position}`);
				}
			} catch (error) {
				console.error(`Error parsing GRIB message ${messageCount + 1}:`, error);
				// エラーが発生しても次のメッセージを試行
				continue;
			}
		}

		console.log(`Parsed ${records.length} records`);
		return records;
	}

	private findAllGribHeaders(): number[] {
		const positions: number[] = [];
		const searchLength = this.buffer.byteLength;

		console.log('Searching for all GRIB headers in file...');

		for (let i = 0; i <= searchLength - 8; i++) {
			if (this.view.getUint32(i, false) === 0x47524942) {
				// "GRIB"
				// GRIB2の確認（position+7にedition）
				if (i + 8 < searchLength) {
					const edition = this.view.getUint8(i + 7);
					if (edition === 2) {
						positions.push(i);
						console.log(`Found GRIB2 header at position ${i}`);

						// メッセージ長を取得して次の検索位置をスキップ
						if (i + 16 < searchLength) {
							const lengthHigh = this.view.getUint32(i + 8, false);
							const lengthLow = this.view.getUint32(i + 12, false);

							if (lengthHigh === 0 && lengthLow > 0 && lengthLow < searchLength) {
								const messageLength = lengthLow;
								console.log(`Message length: ${messageLength} bytes`);

								// 次のメッセージの開始位置までスキップ
								i += messageLength - 1; // -1 because loop will increment i
							}
						}
					} else if (edition === 1) {
						console.log(`Found GRIB1 header at position ${i} (not supported)`);
					} else {
						console.log(`Found GRIB header with unknown edition ${edition} at position ${i}`);
					}
				}
			}
		}

		console.log(`Total GRIB2 headers found: ${positions.length}`);
		return positions;
	}

	private parseMessage(): GribRecord | null {
		const startPosition = this.position;

		// GRIB2メッセージの開始を探す
		if (!this.findGribHeader()) {
			return null;
		}

		try {
			// GRIB2 Section 0の構造:
			// 0-3: "GRIB" (4 bytes)
			// 4-5: Reserved (2 bytes)
			// 6: Discipline (1 byte)
			// 7: Edition (1 byte)
			// 8-15: Total length of GRIB message (8 bytes, big-endian)

			if (this.position + 16 > this.buffer.byteLength) {
				console.warn('Not enough bytes for GRIB header');
				return null;
			}

			// Edition確認 (position 7)
			const edition = this.view.getUint8(this.position + 7);
			if (edition !== 2) {
				console.warn(`Unsupported GRIB edition: ${edition}`);
				return null;
			}

			// メッセージの総長を取得（position 8-15の8バイト）
			// JavaScriptは64bit整数を正確に扱えないので、上位4バイトが0であることを確認
			const lengthHigh = this.view.getUint32(this.position + 8, false);
			const lengthLow = this.view.getUint32(this.position + 12, false);

			if (lengthHigh !== 0) {
				console.warn(`Message too large: high bits = ${lengthHigh}`);
				return null;
			}

			const messageLength = lengthLow;

			console.log(`Message length: ${messageLength} bytes`);

			// メッセージ長の妥当性チェック
			if (messageLength > this.buffer.byteLength - this.position || messageLength < 16) {
				console.warn(
					`Invalid message length: ${messageLength}, remaining buffer: ${this.buffer.byteLength - this.position}`
				);
				return null;
			}

			const messageEnd = this.position + messageLength;
			const sections = this.parseSections(messageEnd);

			if (sections.length < 8) {
				console.warn(`Insufficient sections: ${sections.length}`);
				return null;
			}

			const metadata = this.extractMetadata(sections);
			const values = this.extractValues(sections, metadata);

			// 位置をメッセージの終端に設定
			this.position = messageEnd;

			return {
				metadata,
				values,
				latlons: () => this.generateLatLons(metadata)
			};
		} catch (error) {
			console.error('Error in parseMessage:', error);
			// エラーが発生した場合、開始位置から少し進む
			this.position = startPosition + 1;
			return null;
		}
	}

	private findGribHeader(): boolean {
		const maxSearchLength = Math.min(this.buffer.byteLength - this.position, 10000);

		console.log(
			`Searching for GRIB header from position ${this.position}, search length: ${maxSearchLength}`
		);

		// 最初の16バイトをダンプ
		if (this.position === 0) {
			const firstBytes = new Uint8Array(this.buffer.slice(0, Math.min(16, this.buffer.byteLength)));
			console.log(
				'First 16 bytes:',
				Array.from(firstBytes)
					.map((b) => b.toString(16).padStart(2, '0'))
					.join(' ')
			);
			console.log(
				'First 16 bytes as ASCII:',
				Array.from(firstBytes)
					.map((b) => (b >= 32 && b < 127 ? String.fromCharCode(b) : '.'))
					.join('')
			);
		}

		for (let i = 0; i < maxSearchLength - 4; i++) {
			const currentPos = this.position + i;
			if (currentPos + 4 <= this.buffer.byteLength) {
				const value = this.view.getUint32(currentPos, false);
				if (value === 0x47524942) {
					// "GRIB"
					console.log(`Found GRIB header at position ${currentPos}`);
					this.position = currentPos;
					return true;
				}
			}
		}

		console.log('GRIB header not found');
		// GRIBヘッダーが見つからない場合
		this.position = this.buffer.byteLength;
		return false;
	}

	private parseSections(messageEnd: number): GribSection[] {
		const sections: GribSection[] = [];

		try {
			// Section 0: Indicator Section
			sections.push(this.parseSection0());

			// Section 1: Identification Section
			if (this.position < messageEnd) {
				sections.push(this.parseSection1());
			}

			// Section 2: Local Use Section (optional)
			if (this.position < messageEnd && this.view.getUint8(this.position + 4) === 2) {
				sections.push(this.parseSection2());
			}

			// Section 3: Grid Definition Section
			if (this.position < messageEnd) {
				sections.push(this.parseSection3());
			}

			// Section 4: Product Definition Section
			if (this.position < messageEnd) {
				sections.push(this.parseSection4());
			}

			// Section 5: Data Representation Section
			if (this.position < messageEnd) {
				sections.push(this.parseSection5());
			}

			// Section 6: Bit-Map Section
			if (this.position < messageEnd) {
				sections.push(this.parseSection6());
			}

			// Section 7: Data Section
			if (this.position < messageEnd) {
				sections.push(this.parseSection7());
			}

			// Section 8: End Section
			if (this.position < messageEnd) {
				sections.push(this.parseSection8());
			}
		} catch (error) {
			console.error('Error parsing sections:', error);
		}

		return sections;
	}

	private parseSection0(): GribSection {
		const length = 16; // Section 0は常に16バイト
		this.validatePosition(length);

		const data = this.buffer.slice(this.position, this.position + length);
		this.position += length;

		return { length, number: 0, data };
	}

	private parseSection1(): GribSection {
		const length = this.view.getUint32(this.position, false);
		this.validatePosition(length);

		const number = this.view.getUint8(this.position + 4);
		const data = this.buffer.slice(this.position, this.position + length);
		this.position += length;

		return { length, number, data };
	}

	private parseSection2(): GribSection {
		const length = this.view.getUint32(this.position, false);
		this.validatePosition(length);

		const number = this.view.getUint8(this.position + 4);
		const data = this.buffer.slice(this.position, this.position + length);
		this.position += length;

		return { length, number, data };
	}

	private parseSection3(): GribSection {
		const length = this.view.getUint32(this.position, false);
		this.validatePosition(length);

		const number = this.view.getUint8(this.position + 4);
		const data = this.buffer.slice(this.position, this.position + length);
		this.position += length;

		return { length, number, data };
	}

	private parseSection4(): GribSection {
		const length = this.view.getUint32(this.position, false);
		this.validatePosition(length);

		const number = this.view.getUint8(this.position + 4);
		const data = this.buffer.slice(this.position, this.position + length);
		this.position += length;

		return { length, number, data };
	}

	private parseSection5(): GribSection {
		const length = this.view.getUint32(this.position, false);
		this.validatePosition(length);

		const number = this.view.getUint8(this.position + 4);
		const data = this.buffer.slice(this.position, this.position + length);
		this.position += length;

		return { length, number, data };
	}

	private parseSection6(): GribSection {
		const length = this.view.getUint32(this.position, false);
		this.validatePosition(length);

		const number = this.view.getUint8(this.position + 4);
		const data = this.buffer.slice(this.position, this.position + length);
		this.position += length;

		return { length, number, data };
	}

	private parseSection7(): GribSection {
		const length = this.view.getUint32(this.position, false);
		this.validatePosition(length);

		const number = this.view.getUint8(this.position + 4);
		const data = this.buffer.slice(this.position, this.position + length);
		this.position += length;

		return { length, number, data };
	}

	private parseSection8(): GribSection {
		const length = 4; // Section 8は常に4バイト ("7777")
		this.validatePosition(length);

		const data = this.buffer.slice(this.position, this.position + length);

		// "7777"の確認（より柔軟に）
		const view = new DataView(data);
		const endMarker = view.getUint32(0, false);
		if (endMarker !== 0x37373737) {
			// "7777"
			console.warn(`End marker not standard: 0x${endMarker.toString(16)} (expected 0x37373737)`);
			// エラーで停止せず、警告のみ
		}

		this.position += length;

		return { length, number: 8, data };
	}

	private validatePosition(requiredLength: number): void {
		if (this.position + requiredLength > this.buffer.byteLength) {
			throw new Error(
				`Buffer overflow: position ${this.position} + ${requiredLength} > ${this.buffer.byteLength}`
			);
		}

		if (requiredLength < 0 || requiredLength > 1000000) {
			// 1MB制限
			throw new Error(`Invalid section length: ${requiredLength}`);
		}
	}

	private extractMetadata(sections: GribSection[]): GribMetadata {
		if (sections.length < 5) {
			throw new Error('Insufficient sections for metadata extraction');
		}

		const section0View = new DataView(sections[0].data);
		const section1View = new DataView(sections[1].data);
		const section3View = new DataView(sections[3].data);
		const section4View = new DataView(sections[4].data);

		console.log(`Section 0 length: ${sections[0].data.byteLength}`);
		console.log(`Section 1 length: ${sections[1].data.byteLength}`);
		console.log(`Section 3 length: ${sections[3].data.byteLength}`);
		console.log(`Section 4 length: ${sections[4].data.byteLength}`);

		// Section 0から基本情報
		const edition = section0View.getUint8(7);
		const discipline = section0View.getUint8(6); // Discipline is at position 6

		// Section 1から識別情報 (最小21バイト)
		if (sections[1].data.byteLength < 21) {
			throw new Error(`Section 1 too short: ${sections[1].data.byteLength} bytes`);
		}

		const centre = section1View.getUint16(5, false);
		const subCentre = section1View.getUint16(7, false);
		const masterTableVersion = section1View.getUint8(9);
		const localTableVersion = section1View.getUint8(10);
		const significanceOfRT = section1View.getUint8(11);

		// 参照時刻
		const year = section1View.getUint16(12, false);
		const month = section1View.getUint8(14);
		const day = section1View.getUint8(15);
		const hour = section1View.getUint8(16);
		const minute = section1View.getUint8(17);
		const second = section1View.getUint8(18);
		const referenceTime = new Date(year, month - 1, day, hour, minute, second);

		console.log(`Reference time: ${referenceTime.toISOString()}`);
		console.log(`Centre: ${centre}, Discipline: ${discipline}`);

		// Section 3から格子情報 - より柔軟なチェック
		if (sections[3].data.byteLength < 14) {
			throw new Error(`Section 3 too short: ${sections[3].data.byteLength} bytes`);
		}

		const gridTemplate = section3View.getUint16(12, false);
		console.log(`Grid template: ${gridTemplate}`);

		// 利用可能なデータ数
		let numberOfDataPoints = 0;
		if (sections[3].data.byteLength >= 10) {
			numberOfDataPoints = section3View.getUint32(6, false);
			console.log(`Number of data points: ${numberOfDataPoints}`);
		}

		// Grid Definition Template に応じた処理
		let nx, ny, la1, lo1, la2, lo2, dx, dy;

		if (gridTemplate === 0 && sections[3].data.byteLength >= 72) {
			// Regular lat/lon grid (template 3.0)
			nx = section3View.getUint32(30, false);
			ny = section3View.getUint32(34, false);

			// Basic angle and subdivisions
			const basicAngle = section3View.getUint32(38, false);
			const subdivisions = section3View.getUint32(42, false);

			// If basic angle is 0, use micro-degrees
			const scaleFactor = basicAngle === 0 ? 1000000 : subdivisions / basicAngle;

			la1 = section3View.getInt32(46, false) / scaleFactor;
			lo1 = section3View.getInt32(50, false) / scaleFactor;
			la2 = section3View.getInt32(55, false) / scaleFactor;
			lo2 = section3View.getInt32(59, false) / scaleFactor;
			dx = section3View.getUint32(63, false) / scaleFactor;
			dy = section3View.getUint32(67, false) / scaleFactor;
		} else if (gridTemplate === 40 && sections[3].data.byteLength >= 34) {
			// Gaussian lat/lon grid (template 3.40)
			console.log('Gaussian grid detected (simplified parsing)');
			nx = sections[3].data.byteLength >= 30 ? section3View.getUint32(26, false) : 1;
			ny = sections[3].data.byteLength >= 34 ? section3View.getUint32(30, false) : 1;

			// 簡略化された座標（実際にはより複雑）
			la1 = numberOfDataPoints > 0 ? 90 : 0;
			lo1 = numberOfDataPoints > 0 ? 0 : 0;
			la2 = numberOfDataPoints > 0 ? -90 : 0;
			lo2 = numberOfDataPoints > 0 ? 360 : 0;
			dx = nx > 1 ? 360 / nx : 1;
			dy = ny > 1 ? 180 / ny : 1;
		} else {
			console.warn(
				`Grid template ${gridTemplate} with ${sections[3].data.byteLength} bytes - using simplified parsing`
			);
			// 最小限の情報で処理を継続
			if (numberOfDataPoints > 0) {
				// データポイント数から推定
				const estimatedSize = Math.sqrt(numberOfDataPoints);
				nx = Math.floor(estimatedSize);
				ny = Math.ceil(numberOfDataPoints / nx);
			} else {
				nx = 1;
				ny = 1;
			}
			la1 = lo1 = la2 = lo2 = dx = dy = 0;
		}

		console.log(`Grid: ${nx}x${ny}, lat: ${la1} to ${la2}, lon: ${lo1} to ${lo2}`);

		// Section 4からプロダクト情報 - より柔軟なチェック
		if (sections[4].data.byteLength < 10) {
			throw new Error(`Section 4 too short: ${sections[4].data.byteLength} bytes`);
		}

		const productTemplate = sections[4].data.byteLength >= 9 ? section4View.getUint16(7, false) : 0;
		console.log(`Product template: ${productTemplate}`);

		const parameterCategory = sections[4].data.byteLength >= 10 ? section4View.getUint8(9) : 0;
		const parameterNumber = sections[4].data.byteLength >= 11 ? section4View.getUint8(10) : 0;

		console.log(`Parameter: category=${parameterCategory}, number=${parameterNumber}`);

		// 予測時間の計算（利用可能な場合）
		let forecastTime = 0;
		if (sections[4].data.byteLength >= 22) {
			const hoursAfterRT = section4View.getUint16(14, false);
			const minutesAfterRT = section4View.getUint8(16);
			const timeRangeUnit = section4View.getUint8(17);
			forecastTime = section4View.getUint32(18, false);
			console.log(`Forecast time: ${forecastTime} (unit: ${timeRangeUnit})`);
		}

		// レベル情報（利用可能な場合）
		let levelType = 255; // missing
		let levelValue = 0;
		if (sections[4].data.byteLength >= 28) {
			levelType = section4View.getUint8(22);
			const levelScale = section4View.getUint8(23);
			levelValue = section4View.getUint32(24, false);
		}

		return {
			discipline,
			edition,
			centre,
			parameterNumber,
			levelType,
			levelValue,
			referenceTime,
			forecastTime,
			nx,
			ny,
			la1,
			lo1,
			la2,
			lo2,
			dx,
			dy
		};
	}

	private extractValues(sections: GribSection[], metadata: GribMetadata): Float32Array {
		if (sections.length < 8) {
			throw new Error('Insufficient sections for value extraction');
		}

		console.log(`Section 5 length: ${sections[5].data.byteLength}`);
		console.log(`Section 6 length: ${sections[6].data.byteLength}`);
		console.log(`Section 7 length: ${sections[7].data.byteLength}`);

		const numberOfDataPoints = metadata.nx * metadata.ny;

		// データポイント数の妥当性チェック
		if (numberOfDataPoints > 10000000) {
			// 1000万点制限
			throw new Error(`Too many data points: ${numberOfDataPoints}`);
		}

		const values = new Float32Array(numberOfDataPoints);

		try {
			// Section 5の最小長チェック
			if (sections[5].data.byteLength < 11) {
				console.warn(
					`Section 5 too short (${sections[5].data.byteLength} bytes), filling with zeros`
				);
				values.fill(0);
				return values;
			}

			const section5View = new DataView(sections[5].data);

			// Section 7の最小長チェック
			if (sections[7].data.byteLength < 5) {
				console.warn(
					`Section 7 too short (${sections[7].data.byteLength} bytes), filling with zeros`
				);
				values.fill(0);
				return values;
			}

			const section7View = new DataView(sections[7].data);

			// データ表現テンプレート（安全に読み取り）
			let dataTemplate = 0;
			if (sections[5].data.byteLength >= 11) {
				dataTemplate = section5View.getUint16(9, false);
			}

			console.log(`Data representation template: ${dataTemplate}`);

			if (dataTemplate === 0 && sections[5].data.byteLength >= 21) {
				// 簡単なパッキング
				const referenceValue = section5View.getFloat32(11, false);
				const binaryScaleFactor = section5View.getInt16(15, false);
				const decimalScaleFactor = section5View.getInt16(17, false);
				const bitsPerValue = section5View.getUint8(19);

				console.log(`Reference value: ${referenceValue}`);
				console.log(`Binary scale factor: ${binaryScaleFactor}`);
				console.log(`Decimal scale factor: ${decimalScaleFactor}`);
				console.log(`Bits per value: ${bitsPerValue}`);

				if (bitsPerValue === 0) {
					// 定数値
					console.log('Constant value detected');
					values.fill(referenceValue);
				} else if (
					bitsPerValue === 32 &&
					sections[7].data.byteLength >= 5 + numberOfDataPoints * 4
				) {
					// 32ビットfloat
					console.log('32-bit float values detected');
					for (let i = 0; i < numberOfDataPoints; i++) {
						if (5 + i * 4 + 4 <= sections[7].data.byteLength) {
							values[i] = section7View.getFloat32(5 + i * 4, false);
						} else {
							values[i] = 0; // データが不足している場合は0
						}
					}
				} else if (
					bitsPerValue === 16 &&
					sections[7].data.byteLength >= 5 + numberOfDataPoints * 2
				) {
					// 16ビット整数（簡略化された実装）
					console.log('16-bit integer values detected');
					const E = Math.pow(10, -decimalScaleFactor);
					const D = Math.pow(2, binaryScaleFactor);

					for (let i = 0; i < numberOfDataPoints; i++) {
						if (5 + i * 2 + 2 <= sections[7].data.byteLength) {
							const packedValue = section7View.getUint16(5 + i * 2, false);
							values[i] = (referenceValue + packedValue * D) * E;
						} else {
							values[i] = 0;
						}
					}
				} else {
					// その他のビット数（簡略化）
					console.warn(
						`Bit packing with ${bitsPerValue} bits not fully implemented, using reference value`
					);
					values.fill(referenceValue);
				}
			} else if ((dataTemplate === 2 || dataTemplate === 3) && sections[5].data.byteLength >= 49) {
				// Complex packing (template 2) / Complex packing + spatial differencing (template 3)
				// 参考: https://www.nco.ncep.noaa.gov/pmb/docs/grib2/grib2_doc/grib2_temp5-3.shtml
				// 参考実装: https://github.com/archmoj/grib2class
				const referenceValue = section5View.getFloat32(11, false);
				const binaryScaleFactor = section5View.getInt16(15, false);
				const decimalScaleFactor = section5View.getInt16(17, false);
				const bitsPerValue = section5View.getUint8(19);
				// Octet 22: Group splitting method
				// Octet 23: Missing value management
				// オクテット番号(1始まり) → DataViewオフセット(0始まり) = オクテット - 1
				const numberOfGroups = section5View.getUint32(31, false); // Octet 32-35
				const refForGroupWidths = section5View.getUint8(35); // Octet 36
				const bitsForGroupWidths = section5View.getUint8(36); // Octet 37
				const refForGroupLengths = section5View.getUint32(37, false); // Octet 38-41
				const lengthIncrement = section5View.getUint8(41); // Octet 42
				const trueLengthOfLastGroup = section5View.getUint32(42, false); // Octet 43-46
				const bitsForScaledGroupLengths = section5View.getUint8(46); // Octet 47

				let orderOfSpatialDiff = 0;
				let extraOctetsInDataSection = 0;
				if (dataTemplate === 3 && sections[5].data.byteLength >= 49) {
					orderOfSpatialDiff = section5View.getUint8(47); // Octet 48
					extraOctetsInDataSection = section5View.getUint8(48); // Octet 49
				}

				// --- Section 7 のビット単位読み取りヘルパー ---
				const sec7Bytes = new Uint8Array(sections[7].data);
				let bitPos = 5 * 8; // Section 7のデータはオフセット5から開始

				const readBits = (nBits: number): number => {
					let val = 0;
					for (let i = 0; i < nBits; i++) {
						const byteIdx = Math.floor(bitPos / 8);
						const bitIdx = 7 - (bitPos % 8);
						if (byteIdx < sec7Bytes.length) {
							val = (val << 1) | ((sec7Bytes[byteIdx] >> bitIdx) & 1);
						}
						bitPos++;
					}
					return val;
				};

				const readSignedBits = (nBits: number): number => {
					if (nBits === 0) return 0;
					const raw = readBits(nBits);
					// 最上位ビットが符号
					const signBit = 1 << (nBits - 1);
					if (raw & signBit) {
						return -(raw & (signBit - 1));
					}
					return raw;
				};

				const alignToByte = () => {
					if (bitPos % 8 !== 0) {
						bitPos = (Math.floor(bitPos / 8) + 1) * 8;
					}
				};

				// --- 空間差分の初期値を読む ---
				let firstValues1 = 0;
				let firstValues2 = 0;
				let overallMinimum = 0;

				if (dataTemplate === 3 && extraOctetsInDataSection > 0) {
					firstValues1 = readSignedBits(extraOctetsInDataSection * 8);
					if (orderOfSpatialDiff === 2) {
						firstValues2 = readSignedBits(extraOctetsInDataSection * 8);
					}
					overallMinimum = readSignedBits(extraOctetsInDataSection * 8);
				}

				// --- グループ参照値を読む ---
				const groupRefs = new Int32Array(numberOfGroups);
				for (let i = 0; i < numberOfGroups; i++) {
					groupRefs[i] = readBits(bitsPerValue);
				}
				alignToByte();

				// --- グループ幅を読む ---
				const groupWidths = new Int32Array(numberOfGroups);
				for (let i = 0; i < numberOfGroups; i++) {
					groupWidths[i] = readBits(bitsForGroupWidths) + refForGroupWidths;
				}
				alignToByte();

				// --- グループ長を読む ---
				const groupLengths = new Int32Array(numberOfGroups);
				for (let i = 0; i < numberOfGroups; i++) {
					groupLengths[i] =
						readBits(bitsForScaledGroupLengths) * lengthIncrement + refForGroupLengths;
				}
				if (numberOfGroups > 0) {
					groupLengths[numberOfGroups - 1] = trueLengthOfLastGroup;
				}
				alignToByte();

				// --- 各グループのデータをアンパック ---
				let total = 0;
				for (let i = 0; i < numberOfGroups; i++) {
					total += groupLengths[i];
				}

				const rawData = new Float32Array(total);
				let count = 0;
				for (let i = 0; i < numberOfGroups; i++) {
					if (groupWidths[i] !== 0) {
						for (let j = 0; j < groupLengths[i]; j++) {
							rawData[count] = readBits(groupWidths[i]) + groupRefs[i];
							count++;
						}
					} else {
						for (let j = 0; j < groupLengths[i]; j++) {
							rawData[count] = groupRefs[i];
							count++;
						}
					}
				}

				// --- 空間差分の逆変換 ---
				if (dataTemplate === 3) {
					if (orderOfSpatialDiff === 1) {
						rawData[0] = firstValues1;
						for (let i = 1; i < total; i++) {
							rawData[i] += overallMinimum;
							rawData[i] = rawData[i] + rawData[i - 1];
						}
					} else if (orderOfSpatialDiff === 2) {
						rawData[0] = firstValues1;
						rawData[1] = firstValues2;
						for (let i = 2; i < total; i++) {
							rawData[i] += overallMinimum;
							rawData[i] = rawData[i] + 2 * rawData[i - 1] - rawData[i - 2];
						}
					}
				}

				// --- スケーリング: Y = (R + X * 2^E) / 10^D ---
				const E = Math.pow(2, binaryScaleFactor);
				const D = Math.pow(10, decimalScaleFactor);
				const len = Math.min(total, numberOfDataPoints);
				for (let i = 0; i < len; i++) {
					values[i] = (referenceValue + rawData[i] * E) / D;
				}
			} else {
				console.warn(`Data template ${dataTemplate} not implemented or insufficient data`);
				values.fill(0); // デフォルト値
			}
		} catch (error) {
			console.error('Error extracting values:', error);
			values.fill(0); // エラー時はデフォルト値
		}

		console.log(
			`Extracted ${values.length} values, first few:`,
			Array.from(values.slice(0, Math.min(10, values.length)))
		);
		return values;
	}

	private generateLatLons(metadata: GribMetadata): { lats: Float32Array; lons: Float32Array } {
		const { nx, ny, la1, lo1, dx, dy } = metadata;
		const totalPoints = nx * ny;

		const lats = new Float32Array(totalPoints);
		const lons = new Float32Array(totalPoints);

		let index = 0;
		for (let j = 0; j < ny; j++) {
			for (let i = 0; i < nx; i++) {
				lats[index] = la1 - j * dy;
				lons[index] = lo1 + i * dx;
				index++;
			}
		}

		return { lats, lons };
	}
}

// pygrib風のインターフェース
export class TypeScriptGrib {
	static async open(filePath: string | ArrayBuffer): Promise<{
		messages: GribRecord[];
		length: number;
		close(): void;
		summary(): void;
	}> {
		let buffer: ArrayBuffer;

		if (typeof filePath === 'string') {
			const response = await fetch(filePath);
			buffer = await response.arrayBuffer();
		} else {
			buffer = filePath;
		}

		console.log(`Opening GRIB file, buffer size: ${buffer.byteLength} bytes`);

		// まず圧縮されているかチェック
		const decompressedBuffer = await this.tryDecompression(buffer);

		const parser = new PureGrib2Parser(decompressedBuffer);
		const messages = parser.parse();

		return {
			messages,
			length: messages.length,
			close: () => {
				console.log('GRIB file closed');
			},
			summary: () => {
				console.log('=== GRIB File Summary ===');
				console.log(`Total messages: ${messages.length}`);
				console.log(`File size: ${buffer.byteLength} bytes`);

				if (messages.length > 0) {
					console.log('\nMessage details:');
					messages.forEach((msg, index) => {
						const meta = msg.metadata;
						console.log(`Message ${index + 1}:`);
						console.log(`  Reference time: ${meta.referenceTime.toISOString()}`);
						console.log(`  Parameter: ${meta.parameterNumber} (category ${meta.discipline})`);
						console.log(`  Level: ${meta.levelType} = ${meta.levelValue}`);
						console.log(`  Forecast time: ${meta.forecastTime}`);
						console.log(`  Grid: ${meta.nx}x${meta.ny}`);
						console.log(`  Lat range: ${meta.la1} to ${meta.la2}`);
						console.log(`  Lon range: ${meta.lo1} to ${meta.lo2}`);
						console.log(`  Data points: ${msg.values.length}`);

						if (msg.values.length > 0) {
							const min = Math.min(...msg.values);
							const max = Math.max(...msg.values);
							const avg = msg.values.reduce((sum, val) => sum + val, 0) / msg.values.length;
							console.log(
								`  Value range: ${min.toFixed(3)} to ${max.toFixed(3)} (avg: ${avg.toFixed(3)})`
							);
						}
						console.log('');
					});
				}
				console.log('=== End Summary ===');
			}
		};
	}

	// 圧縮解除を試行
	private static async tryDecompression(buffer: ArrayBuffer): Promise<ArrayBuffer> {
		const uint8View = new Uint8Array(buffer);

		console.log('=== Checking compression ===');

		// GZIP圧縮をチェック (1F 8B で始まる)
		if (uint8View.length >= 2 && uint8View[0] === 0x1f && uint8View[1] === 0x8b) {
			console.log('Detected GZIP compression');
			try {
				const decompressedStream = new DecompressionStream('gzip');
				const writer = decompressedStream.writable.getWriter();
				const reader = decompressedStream.readable.getReader();

				// データを書き込み
				await writer.write(uint8View);
				await writer.close();

				// 結果を読み取り
				const chunks: Uint8Array[] = [];
				let done = false;

				while (!done) {
					const { value, done: streamDone } = await reader.read();
					done = streamDone;
					if (value) {
						chunks.push(value);
					}
				}

				// チャンクを結合
				const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
				const result = new Uint8Array(totalLength);
				let offset = 0;

				for (const chunk of chunks) {
					result.set(chunk, offset);
					offset += chunk.length;
				}

				console.log(`GZIP decompressed: ${buffer.byteLength} -> ${result.length} bytes`);
				return result.buffer;
			} catch (error) {
				console.error('GZIP decompression failed:', error);
			}
		}

		// DEFLATE圧縮をチェック (78 で始まることが多い)
		if (uint8View.length >= 2 && uint8View[0] === 0x78) {
			console.log('Possible DEFLATE compression detected');
			try {
				const decompressedStream = new DecompressionStream('deflate');
				const writer = decompressedStream.writable.getWriter();
				const reader = decompressedStream.readable.getReader();

				await writer.write(uint8View);
				await writer.close();

				const chunks: Uint8Array[] = [];
				let done = false;

				while (!done) {
					const { value, done: streamDone } = await reader.read();
					done = streamDone;
					if (value) {
						chunks.push(value);
					}
				}

				const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
				const result = new Uint8Array(totalLength);
				let offset = 0;

				for (const chunk of chunks) {
					result.set(chunk, offset);
					offset += chunk.length;
				}

				console.log(`DEFLATE decompressed: ${buffer.byteLength} -> ${result.length} bytes`);
				return result.buffer;
			} catch (error) {
				console.error('DEFLATE decompression failed:', error);
			}
		}

		// bzip2をチェック (BZ で始まる)
		if (uint8View.length >= 2 && uint8View[0] === 0x42 && uint8View[1] === 0x5a) {
			console.log('Detected BZIP2 compression (not supported in browser)');
		}

		// LZ4をチェック (04 22 4D 18 で始まる)
		if (
			uint8View.length >= 4 &&
			uint8View[0] === 0x04 &&
			uint8View[1] === 0x22 &&
			uint8View[2] === 0x4d &&
			uint8View[3] === 0x18
		) {
			console.log('Detected LZ4 compression (not supported in browser)');
		}

		// 既にGRIBヘッダーがあるかチェック
		for (let i = 0; i <= uint8View.length - 4; i++) {
			const view = new DataView(buffer, i, 4);
			if (view.getUint32(0, false) === 0x47524942) {
				// "GRIB"
				console.log(`Found GRIB header at position ${i} - file may not be compressed`);
				return buffer;
			}
		}

		console.log('No known compression format detected, trying raw data');
		return buffer;
	}

	// ファイル内容の分析用ユーティリティ
	static analyzeFile(buffer: ArrayBuffer): void {
		console.log('=== File Analysis ===');
		console.log(`File size: ${buffer.byteLength} bytes`);

		const view = new DataView(buffer);
		const uint8View = new Uint8Array(buffer);

		// ファイルマジックナンバーをチェック
		console.log('\n=== File Magic Numbers ===');
		if (buffer.byteLength >= 4) {
			const first4 = Array.from(uint8View.slice(0, 4))
				.map((b) => b.toString(16).padStart(2, '0'))
				.join(' ');
			console.log(`First 4 bytes: ${first4}`);

			// 圧縮形式のチェック
			if (uint8View[0] === 0x1f && uint8View[1] === 0x8b) {
				console.log('→ GZIP compressed file');
			} else if (uint8View[0] === 0x78) {
				console.log('→ Possible DEFLATE compressed file');
			} else if (uint8View[0] === 0x42 && uint8View[1] === 0x5a) {
				console.log('→ BZIP2 compressed file');
			} else if (view.getUint32(0, false) === 0x47524942) {
				console.log('→ GRIB file (uncompressed)');
			} else if (view.getUint32(0, false) === 0x504b0304) {
				console.log('→ ZIP file');
			} else if (
				uint8View[0] === 0x28 &&
				uint8View[1] === 0xb5 &&
				uint8View[2] === 0x2f &&
				uint8View[3] === 0xfd
			) {
				console.log('→ ZSTD compressed file');
			} else {
				console.log('→ Unknown format');
			}
		}

		// 最初の100バイトを16進ダンプ
		const dumpLength = Math.min(100, buffer.byteLength);
		console.log(`\n=== First ${dumpLength} bytes (hex dump) ===`);
		for (let i = 0; i < dumpLength; i += 16) {
			const chunk = uint8View.slice(i, Math.min(i + 16, dumpLength));
			const hex = Array.from(chunk)
				.map((b) => b.toString(16).padStart(2, '0'))
				.join(' ');
			const ascii = Array.from(chunk)
				.map((b) => (b >= 32 && b < 127 ? String.fromCharCode(b) : '.'))
				.join('');
			console.log(`${i.toString(16).padStart(4, '0')}: ${hex.padEnd(47, ' ')} |${ascii}|`);
		}

		// エントロピー分析（圧縮されているかの推定）
		console.log('\n=== Entropy Analysis ===');
		const byteFreq = new Array(256).fill(0);
		for (let i = 0; i < Math.min(1000, uint8View.length); i++) {
			byteFreq[uint8View[i]]++;
		}

		let entropy = 0;
		const sampleSize = Math.min(1000, uint8View.length);
		for (let i = 0; i < 256; i++) {
			if (byteFreq[i] > 0) {
				const p = byteFreq[i] / sampleSize;
				entropy -= p * Math.log2(p);
			}
		}

		console.log(`Entropy: ${entropy.toFixed(2)} bits per byte`);
		if (entropy > 7.5) {
			console.log('→ High entropy, likely compressed or encrypted');
		} else if (entropy < 4) {
			console.log('→ Low entropy, likely text or simple data');
		} else {
			console.log('→ Medium entropy, could be binary data');
		}

		// 可能なGRIBヘッダーを検索
		console.log('\n=== Searching for GRIB patterns ===');
		let gribCount = 0;
		for (let i = 0; i <= buffer.byteLength - 4; i++) {
			if (view.getUint32(i, false) === 0x47524942) {
				// "GRIB"
				console.log(`Found "GRIB" at position ${i}`);
				gribCount++;

				// 次の16バイトを表示
				if (i + 16 <= buffer.byteLength) {
					const gribHeader = uint8View.slice(i, i + 16);
					const hex = Array.from(gribHeader)
						.map((b) => b.toString(16).padStart(2, '0'))
						.join(' ');
					console.log(`  Header: ${hex}`);

					// GRIB2の場合、位置7に版数が入る
					if (i + 8 < buffer.byteLength) {
						const edition = view.getUint8(i + 7);
						console.log(`  Edition: ${edition}`);
					}
				}
			}
		}

		if (gribCount === 0) {
			console.log('No GRIB headers found - file is likely compressed');
		}

		console.log('=== End Analysis ===');
	}

	// 手動で圧縮解除を試行する関数
	static async tryManualDecompression(
		buffer: ArrayBuffer,
		method: 'gzip' | 'deflate'
	): Promise<ArrayBuffer> {
		console.log(`Trying ${method} decompression...`);

		try {
			const uint8View = new Uint8Array(buffer);
			const decompressedStream = new DecompressionStream(method);
			const writer = decompressedStream.writable.getWriter();
			const reader = decompressedStream.readable.getReader();

			await writer.write(uint8View);
			await writer.close();

			const chunks: Uint8Array[] = [];
			let done = false;

			while (!done) {
				const { value, done: streamDone } = await reader.read();
				done = streamDone;
				if (value) {
					chunks.push(value);
				}
			}

			const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
			const result = new Uint8Array(totalLength);
			let offset = 0;

			for (const chunk of chunks) {
				result.set(chunk, offset);
				offset += chunk.length;
			}

			console.log(
				`${method} decompression successful: ${buffer.byteLength} -> ${result.length} bytes`
			);
			return result.buffer;
		} catch (error) {
			console.error(`${method} decompression failed:`, error);
			throw error;
		}
	}
}
