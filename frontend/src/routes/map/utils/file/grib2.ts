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

		const gribPositions = this.findAllGribHeaders();

		// 各GRIBヘッダーでメッセージを解析
		for (let i = 0; i < gribPositions.length && messageCount < this.maxMessages; i++) {
			this.position = gribPositions[i];

			try {

				const result = this.parseMessage();
				if (result) {
					records.push(...result);
					messageCount += result.length;
				} else {
				}
			} catch (error) {
				console.error(`Error parsing GRIB message ${messageCount + 1}:`, error);
				// エラーが発生しても次のメッセージを試行
				continue;
			}
		}

		return records;
	}

	private findAllGribHeaders(): number[] {
		const positions: number[] = [];
		const searchLength = this.buffer.byteLength;


		for (let i = 0; i <= searchLength - 8; i++) {
			if (this.view.getUint32(i, false) === 0x47524942) {
				// "GRIB"
				// GRIB2の確認（position+7にedition）
				if (i + 8 < searchLength) {
					const edition = this.view.getUint8(i + 7);
					if (edition === 2) {
						positions.push(i);

						// メッセージ長を取得して次の検索位置をスキップ
						if (i + 16 < searchLength) {
							const lengthHigh = this.view.getUint32(i + 8, false);
							const lengthLow = this.view.getUint32(i + 12, false);

							if (lengthHigh === 0 && lengthLow > 0 && lengthLow < searchLength) {
								const messageLength = lengthLow;

								// 次のメッセージの開始位置までスキップ
								i += messageLength - 1; // -1 because loop will increment i
							}
						}
					} else if (edition === 1) {
					} else {
					}
				}
			}
		}

		return positions;
	}

	private parseMessage(): GribRecord[] | null {
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


			// メッセージ長の妥当性チェック
			if (messageLength > this.buffer.byteLength - this.position || messageLength < 16) {
				console.warn(
					`Invalid message length: ${messageLength}, remaining buffer: ${this.buffer.byteLength - this.position}`
				);
				return null;
			}

			const messageEnd = this.position + messageLength;
			const allSections = this.parseSections(messageEnd);

			// セクション番号でグループ化: Section 3-7 の繰り返しを各レコードに分解
			const records: GribRecord[] = [];
			let currentSec3: GribSection | null = null;
			let currentSec4: GribSection | null = null;
			let currentSec5: GribSection | null = null;
			let currentSec6: GribSection | null = null;

			const sec0 = allSections.find((s) => s.number === 0);
			const sec1 = allSections.find((s) => s.number === 1);

			for (const sec of allSections) {
				if (sec.number === 3) currentSec3 = sec;
				else if (sec.number === 4) currentSec4 = sec;
				else if (sec.number === 5) currentSec5 = sec;
				else if (sec.number === 6) currentSec6 = sec;
				else if (sec.number === 7 && sec0 && sec1 && currentSec3 && currentSec4 && currentSec5 && currentSec6) {
					const sectionSet = [sec0, sec1, currentSec3, currentSec4, currentSec5, currentSec6, sec];
					try {
						const metadata = this.extractMetadata(sectionSet);
						const values = this.extractValues(sectionSet, metadata);
						records.push({
							metadata,
							values,
							latlons: () => this.generateLatLons(metadata)
						});
					} catch (e) {
						console.warn('Error extracting record:', e);
					}
				}
			}

			this.position = messageEnd;

			if (records.length > 0) {
				return records;
			}
			return null;
		} catch (error) {
			console.error('Error in parseMessage:', error);
			this.position = startPosition + 1;
			return null;
		}
	}

	private findGribHeader(): boolean {
		const maxSearchLength = Math.min(this.buffer.byteLength - this.position, 10000);

		for (let i = 0; i < maxSearchLength - 4; i++) {
			const currentPos = this.position + i;
			if (currentPos + 4 <= this.buffer.byteLength) {
				const value = this.view.getUint32(currentPos, false);
				if (value === 0x47524942) {
					// "GRIB"
					this.position = currentPos;
					return true;
				}
			}
		}

		// GRIBヘッダーが見つからない場合
		this.position = this.buffer.byteLength;
		return false;
	}

	private parseSections(messageEnd: number): GribSection[] {
		const sections: GribSection[] = [];

		try {
			// Section 0: Indicator Section (常に16バイト)
			sections.push(this.parseSection0());

			// Section 1以降: セクション番号を読んで動的にディスパッチ
			while (this.position < messageEnd - 4) {
				// Section 8 ("7777") のチェック
				const possibleEnd = this.view.getUint32(this.position, false);
				if (possibleEnd === 0x37373737) {
					sections.push({ length: 4, number: 8, data: this.buffer.slice(this.position, this.position + 4) });
					this.position += 4;
					break;
				}

				// セクション長とセクション番号を読む
				const secLength = this.view.getUint32(this.position, false);
				if (secLength < 5 || this.position + secLength > messageEnd) {
					break;
				}
				const secNumber = this.view.getUint8(this.position + 4);
				const secData = this.buffer.slice(this.position, this.position + secLength);
				sections.push({ length: secLength, number: secNumber, data: secData });
				this.position += secLength;
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

	/**
	 * GRIB2の符号+絶対値形式の16bit整数を読み取る
	 * MSBが符号（1=負）、残り15ビットが絶対値
	 */
	private static readSignedGrib16(view: DataView, offset: number): number {
		const raw = view.getUint16(offset, false);
		const sign = (raw >> 15) & 1;
		const magnitude = raw & 0x7fff;
		return sign ? -magnitude : magnitude;
	}

	/** セクション番号でセクションを検索 */
	private findSection(sections: GribSection[], num: number): GribSection {
		const sec = sections.find((s) => s.number === num);
		if (!sec) throw new Error(`Section ${num} not found`);
		return sec;
	}

	private extractMetadata(sections: GribSection[]): GribMetadata {
		const sec0 = this.findSection(sections, 0);
		const sec1 = this.findSection(sections, 1);
		const sec3 = this.findSection(sections, 3);
		const sec4 = this.findSection(sections, 4);

		const section0View = new DataView(sec0.data);
		const section1View = new DataView(sec1.data);
		const section3View = new DataView(sec3.data);
		const section4View = new DataView(sec4.data);

		// Section 0から基本情報
		const edition = section0View.getUint8(7);
		const discipline = section0View.getUint8(6); // Discipline is at position 6

		// Section 1から識別情報 (最小21バイト)
		if (sec1.data.byteLength < 21) {
			throw new Error(`Section 1 too short: ${sec1.data.byteLength} bytes`);
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


		// Section 3から格子情報 - より柔軟なチェック
		if (sec3.data.byteLength < 14) {
			throw new Error(`Section 3 too short: ${sec3.data.byteLength} bytes`);
		}

		const gridTemplate = section3View.getUint16(12, false);

		// 利用可能なデータ数
		let numberOfDataPoints = 0;
		if (sec3.data.byteLength >= 10) {
			numberOfDataPoints = section3View.getUint32(6, false);
		}

		// Grid Definition Template に応じた処理
		let nx, ny, la1, lo1, la2, lo2, dx, dy;

		if (gridTemplate === 0 && sec3.data.byteLength >= 72) {
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
		} else if (gridTemplate === 40 && sec3.data.byteLength >= 34) {
			// Gaussian lat/lon grid (template 3.40)
			nx = sec3.data.byteLength >= 30 ? section3View.getUint32(26, false) : 1;
			ny = sec3.data.byteLength >= 34 ? section3View.getUint32(30, false) : 1;

			// 簡略化された座標（実際にはより複雑）
			la1 = numberOfDataPoints > 0 ? 90 : 0;
			lo1 = numberOfDataPoints > 0 ? 0 : 0;
			la2 = numberOfDataPoints > 0 ? -90 : 0;
			lo2 = numberOfDataPoints > 0 ? 360 : 0;
			dx = nx > 1 ? 360 / nx : 1;
			dy = ny > 1 ? 180 / ny : 1;
		} else {
			console.warn(
				`Grid template ${gridTemplate} with ${sec3.data.byteLength} bytes - using simplified parsing`
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


		// Section 4からプロダクト情報 - より柔軟なチェック
		if (sec4.data.byteLength < 10) {
			throw new Error(`Section 4 too short: ${sec4.data.byteLength} bytes`);
		}

		const productTemplate = sec4.data.byteLength >= 9 ? section4View.getUint16(7, false) : 0;

		const parameterCategory = sec4.data.byteLength >= 10 ? section4View.getUint8(9) : 0;
		const parameterNumber = sec4.data.byteLength >= 11 ? section4View.getUint8(10) : 0;


		// 予測時間の計算（利用可能な場合）
		let forecastTime = 0;
		if (sec4.data.byteLength >= 22) {
			const hoursAfterRT = section4View.getUint16(14, false);
			const minutesAfterRT = section4View.getUint8(16);
			const timeRangeUnit = section4View.getUint8(17);
			forecastTime = section4View.getUint32(18, false);
		}

		// レベル情報（利用可能な場合）
		let levelType = 255; // missing
		let levelValue = 0;
		if (sec4.data.byteLength >= 28) {
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
		const sec5 = this.findSection(sections, 5);
		const sec7 = this.findSection(sections, 7);

		const numberOfDataPoints = metadata.nx * metadata.ny;

		// データポイント数の妥当性チェック
		if (numberOfDataPoints > 10000000) {
			// 1000万点制限
			throw new Error(`Too many data points: ${numberOfDataPoints}`);
		}

		const values = new Float32Array(numberOfDataPoints);

		try {
			// Section 5の最小長チェック
			if (sec5.data.byteLength < 11) {
				console.warn(
					`Section 5 too short (${sec5.data.byteLength} bytes), filling with zeros`
				);
				values.fill(0);
				return values;
			}

			const section5View = new DataView(sec5.data);

			// Section 7の最小長チェック
			if (sec7.data.byteLength < 5) {
				console.warn(
					`Section 7 too short (${sec7.data.byteLength} bytes), filling with zeros`
				);
				values.fill(0);
				return values;
			}

			const section7View = new DataView(sec7.data);

			// データ表現テンプレート（安全に読み取り）
			let dataTemplate = 0;
			if (sec5.data.byteLength >= 11) {
				dataTemplate = section5View.getUint16(9, false);
			}


			if (dataTemplate === 0 && sec5.data.byteLength >= 21) {
				// 簡単なパッキング (Template 5.0)
				const referenceValue = section5View.getFloat32(11, false);
				const binaryScaleFactor = PureGrib2Parser.readSignedGrib16(section5View, 15);
				const decimalScaleFactor = PureGrib2Parser.readSignedGrib16(section5View, 17);
				const bitsPerValue = section5View.getUint8(19);


				if (bitsPerValue === 0) {
					// 定数値
					values.fill(referenceValue);
				} else if (
					bitsPerValue === 32 &&
					sec7.data.byteLength >= 5 + numberOfDataPoints * 4
				) {
					// 32ビットfloat
					for (let i = 0; i < numberOfDataPoints; i++) {
						if (5 + i * 4 + 4 <= sec7.data.byteLength) {
							values[i] = section7View.getFloat32(5 + i * 4, false);
						} else {
							values[i] = 0; // データが不足している場合は0
						}
					}
				} else if (
					bitsPerValue === 16 &&
					sec7.data.byteLength >= 5 + numberOfDataPoints * 2
				) {
					// 16ビット整数（簡略化された実装）
					const E = Math.pow(10, -decimalScaleFactor);
					const D = Math.pow(2, binaryScaleFactor);

					for (let i = 0; i < numberOfDataPoints; i++) {
						if (5 + i * 2 + 2 <= sec7.data.byteLength) {
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
			} else if ((dataTemplate === 2 || dataTemplate === 3) && sec5.data.byteLength >= 49) {
				// Complex packing (template 2) / Complex packing + spatial differencing (template 3)
				// 参考: https://www.nco.ncep.noaa.gov/pmb/docs/grib2/grib2_doc/grib2_temp5-3.shtml
				// 参考実装: https://github.com/archmoj/grib2class
				const referenceValue = section5View.getFloat32(11, false);
				const binaryScaleFactor = PureGrib2Parser.readSignedGrib16(section5View, 15);
				const decimalScaleFactor = PureGrib2Parser.readSignedGrib16(section5View, 17);
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
				if (dataTemplate === 3 && sec5.data.byteLength >= 49) {
					orderOfSpatialDiff = section5View.getUint8(47); // Octet 48
					extraOctetsInDataSection = section5View.getUint8(48); // Octet 49
				}

				// --- Section 7 のビット単位読み取りヘルパー ---
				const sec7Bytes = new Uint8Array(sec7.data);
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
