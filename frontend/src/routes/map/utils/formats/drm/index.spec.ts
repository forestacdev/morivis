import { describe, expect, it } from 'vitest'

import { decodeEbcdic, readInt, readText } from './ebcdic'
import {
	classifyNationalRoad,
	CRS_JGD2000,
	CRS_TOKYO,
	detectCrs,
	detectCrsCandidates,
	getDrmInputName,
	meshCodeFromFileName,
	meshOrigin,
	parseMesh,
	RECORD_ID_ALL_NODE,
	RECORD_ID_ALL_LINK,
	RECORD_ID_BASIC_NODE,
	RECORD_ID_BASIC_LINK,
	RECORD_LENGTH,
	toGeoJson
} from '.'

const ebcdic = (text: string): Uint8Array => {
	const table: Record<string, number> = {}

	for (let index = 0; index <= 9; index += 1) {
		table[String(index)] = 0xf0 + index
	}

	table[' '] = 0x40

	return new Uint8Array([...text].map((char) => table[char] ?? 0x40))
}

interface SharedRouteSpec {
	roadType?: number
	routeNo?: number
	mainSubRoad?: number
}

interface LinkInnerAttributeSpec {
	typeCode?: number
	displayLevel?: number
	startPointNo?: number
	startConnected?: number
	endPointNo?: number
	endConnected?: number
	length?: number
	labelX?: number
	labelY?: number
	kanjiCount?: number
	kanaCount?: number
	vehicleRestriction?: number
	facilityCode?: number
}

interface CorrespondenceLinkSpec {
	node1?: number
	node2?: number
}

interface RecordSpec {
	recordId?: string
	useDefaultCoreFields?: boolean
	node1?: number
	node2?: number
	manager?: number
	roadType?: number
	routeNo?: number
	mainSubRoad?: number
	sharedRouteCount?: number
	sharedRoutes?: SharedRouteSpec[]
	adminCode?: number
	linkLength?: number
	linkType?: number
	linkPassability?: number
	roadWidthClass?: number
	laneCount?: number
	trafficRegulationType?: number
	trafficRegulationCondition?: number
	designated?: number
	basicLinkNode1?: number
	basicLinkNode2?: number
	linkAttributePresence?: number
	shapeSource?: number
	points?: [number, number][]
	pointTotal?: number
	continuation?: number
}

interface NodeRecordSpec {
	nodeNo?: number
	itemRecordNo?: number
	x?: number
	y?: number
	elevation?: number
	nodeType?: number
	adjacentMeshCode?: number
	adjacentNodeNo?: number
	connectionCount?: number
}

const createBasicRecord = (spec: RecordSpec = {}): Uint8Array => {
	const {
		recordId = RECORD_ID_BASIC_LINK,
		useDefaultCoreFields = true,
		points = [],
		continuation = 0
	} = spec
	const total = spec.pointTotal ?? points.length

	const buffer = ebcdic(' '.repeat(RECORD_LENGTH))
	const put = (start: number, length: number, value: number | string) => {
		const text = String(value).padStart(length, '0')
		buffer.set(ebcdic(text), start - 1)
	}
	const putIfDefined = (start: number, length: number, value: number | string | undefined) => {
		if (value === undefined) return
		put(start, length, value)
	}

	put(1, 2, recordId)
	putIfDefined(3, 4, spec.node1 ?? (useDefaultCoreFields ? 1 : undefined))
	putIfDefined(7, 4, spec.node2 ?? (useDefaultCoreFields ? 34 : undefined))
	putIfDefined(13, 1, spec.manager ?? (useDefaultCoreFields ? 4 : undefined))
	putIfDefined(14, 1, spec.roadType ?? (useDefaultCoreFields ? 3 : undefined))
	putIfDefined(15, 4, spec.routeNo ?? (useDefaultCoreFields ? 228 : undefined))
	putIfDefined(19, 1, spec.mainSubRoad ?? (useDefaultCoreFields ? 1 : undefined))
	putIfDefined(20, 2, spec.sharedRouteCount)
	spec.sharedRoutes?.slice(0, 3).forEach((sharedRoute, index) => {
		const base = 22 + index * 6
		putIfDefined(base, 1, sharedRoute.roadType)
		putIfDefined(base + 1, 4, sharedRoute.routeNo)
		putIfDefined(base + 5, 1, sharedRoute.mainSubRoad)
	})
	putIfDefined(40, 5, spec.adminCode ?? (useDefaultCoreFields ? 1331 : undefined))
	putIfDefined(45, 5, spec.linkLength ?? (useDefaultCoreFields ? 320 : undefined))
	putIfDefined(50, 1, spec.linkType)
	putIfDefined(54, 1, spec.linkPassability)
	putIfDefined(59, 1, spec.roadWidthClass)
	putIfDefined(60, 1, spec.laneCount)
	putIfDefined(83, 1, spec.trafficRegulationType)
	putIfDefined(84, 1, spec.trafficRegulationCondition)
	put(89, 3, total)
	points.slice(0, 16).forEach(([x, y], index) => {
		put(92 + index * 10, 5, x)
		put(97 + index * 10, 5, y)
	})
	putIfDefined(254, 1, spec.shapeSource)
	putIfDefined(255, 1, spec.designated ?? (useDefaultCoreFields ? 1 : undefined))
	put(256, 1, continuation)

	return buffer
}

const createAllRoadRecord = (spec: RecordSpec = {}): Uint8Array => {
	const {
		useDefaultCoreFields = true,
		points = [],
		continuation = 0
	} = spec
	const total = spec.pointTotal ?? points.length

	const buffer = ebcdic(' '.repeat(RECORD_LENGTH))
	const put = (start: number, length: number, value: number | string) => {
		buffer.set(ebcdic(String(value).padStart(length, '0')), start - 1)
	}
	const putIfDefined = (start: number, length: number, value: number | string | undefined) => {
		if (value === undefined) return
		put(start, length, value)
	}

	put(1, 2, RECORD_ID_ALL_LINK)
	putIfDefined(3, 5, spec.node1 ?? (useDefaultCoreFields ? 1 : undefined))
	putIfDefined(8, 5, spec.node2 ?? (useDefaultCoreFields ? 34 : undefined))
	putIfDefined(15, 1, spec.manager ?? (useDefaultCoreFields ? 5 : undefined))
	putIfDefined(16, 1, spec.roadType ?? (useDefaultCoreFields ? 9 : undefined))
	putIfDefined(17, 5, spec.adminCode ?? (useDefaultCoreFields ? 1331 : undefined))
	putIfDefined(22, 5, spec.linkLength ?? (useDefaultCoreFields ? 120 : undefined))
	putIfDefined(27, 1, spec.roadWidthClass)
	putIfDefined(28, 1, spec.laneCount)
	putIfDefined(29, 1, spec.trafficRegulationType)
	putIfDefined(30, 1, spec.trafficRegulationCondition)
	putIfDefined(31, 4, spec.basicLinkNode1)
	putIfDefined(35, 4, spec.basicLinkNode2)
	put(39, 3, total)
	points.slice(0, 21).forEach(([x, y], index) => {
		put(42 + index * 10, 5, x)
		put(47 + index * 10, 5, y)
	})
	putIfDefined(252, 1, spec.linkAttributePresence)
	putIfDefined(253, 1, spec.linkPassability)
	putIfDefined(254, 1, spec.shapeSource)
	put(256, 1, continuation)

	return buffer
}

const createBasicNodeRecord = (spec: NodeRecordSpec = {}): Uint8Array => {
	const buffer = ebcdic(' '.repeat(RECORD_LENGTH))
	const put = (start: number, length: number, value: number | string) => {
		buffer.set(ebcdic(String(value).padStart(length, '0')), start - 1)
	}
	const putIfDefined = (start: number, length: number, value: number | string | undefined) => {
		if (value === undefined) return
		put(start, length, value)
	}

	put(1, 2, RECORD_ID_BASIC_NODE)
	putIfDefined(3, 4, spec.nodeNo ?? 1)
	putIfDefined(7, 2, spec.itemRecordNo ?? 1)
	putIfDefined(9, 5, spec.x ?? 0)
	putIfDefined(14, 5, spec.y ?? 0)
	putIfDefined(19, 3, spec.elevation)
	putIfDefined(22, 1, spec.nodeType ?? 1)
	putIfDefined(23, 6, spec.adjacentMeshCode)
	putIfDefined(29, 4, spec.adjacentNodeNo)
	putIfDefined(33, 1, spec.connectionCount)

	return buffer
}

const createAllRoadNodeRecord = (spec: NodeRecordSpec = {}): Uint8Array => {
	const buffer = ebcdic(' '.repeat(RECORD_LENGTH))
	const put = (start: number, length: number, value: number | string) => {
		buffer.set(ebcdic(String(value).padStart(length, '0')), start - 1)
	}
	const putIfDefined = (start: number, length: number, value: number | string | undefined) => {
		if (value === undefined) return
		put(start, length, value)
	}

	put(1, 2, RECORD_ID_ALL_NODE)
	putIfDefined(3, 5, spec.nodeNo ?? 1)
	putIfDefined(8, 5, spec.x ?? 0)
	putIfDefined(13, 5, spec.y ?? 0)
	putIfDefined(18, 1, spec.nodeType ?? 1)
	putIfDefined(19, 6, spec.adjacentMeshCode)
	putIfDefined(25, 5, spec.adjacentNodeNo)
	putIfDefined(30, 1, spec.connectionCount)

	return buffer
}

const createBasicLinkAttributeRecord = (
	attributes: LinkInnerAttributeSpec[],
	options: {
		node1?: number
		node2?: number
		total?: number
		continuation?: number
	} = {}
): Uint8Array => {
	const {
		node1 = 1,
		node2 = 34,
		total = attributes.length,
		continuation = 0
	} = options

	const buffer = ebcdic(' '.repeat(RECORD_LENGTH))
	const put = (start: number, length: number, value: number | string) => {
		buffer.set(ebcdic(String(value).padStart(length, '0')), start - 1)
	}
	const putIfDefined = (start: number, length: number, value: number | string | undefined) => {
		if (value === undefined) return
		put(start, length, value)
	}

	put(1, 2, 23)
	put(3, 4, node1)
	put(7, 4, node2)
	put(15, 2, total)

	attributes.slice(0, 3).forEach((attribute, index) => {
		const base = 17 + index * 70
		putIfDefined(base, 2, attribute.typeCode)
		putIfDefined(base + 2, 1, attribute.displayLevel)
		putIfDefined(base + 3, 3, attribute.startPointNo)
		putIfDefined(base + 6, 1, attribute.startConnected)
		putIfDefined(base + 7, 3, attribute.endPointNo)
		putIfDefined(base + 10, 1, attribute.endConnected)
		putIfDefined(base + 11, 5, attribute.length)
		putIfDefined(base + 16, 5, attribute.labelX)
		putIfDefined(base + 21, 5, attribute.labelY)
		putIfDefined(base + 26, 2, attribute.kanjiCount)
		putIfDefined(base + 48, 2, attribute.kanaCount)
		putIfDefined(227 + index * 6, 1, attribute.vehicleRestriction)
		putIfDefined(228 + index * 6, 5, attribute.facilityCode)
	})

	put(256, 1, continuation)
	return buffer
}

const createAllRoadLinkAttributeRecord = (
	attributes: LinkInnerAttributeSpec[],
	options: {
		node1?: number
		node2?: number
		total?: number
		continuation?: number
	} = {}
): Uint8Array => {
	const {
		node1 = 1,
		node2 = 34,
		total = attributes.length,
		continuation = 0
	} = options

	const buffer = ebcdic(' '.repeat(RECORD_LENGTH))
	const put = (start: number, length: number, value: number | string) => {
		buffer.set(ebcdic(String(value).padStart(length, '0')), start - 1)
	}
	const putIfDefined = (start: number, length: number, value: number | string | undefined) => {
		if (value === undefined) return
		put(start, length, value)
	}

	put(1, 2, 93)
	put(3, 5, node1)
	put(8, 5, node2)
	put(15, 2, total)

	attributes.slice(0, 3).forEach((attribute, index) => {
		const base = 17 + index * 70
		putIfDefined(base, 2, attribute.typeCode)
		putIfDefined(base + 2, 1, attribute.displayLevel)
		putIfDefined(base + 3, 3, attribute.startPointNo)
		putIfDefined(base + 6, 1, attribute.startConnected)
		putIfDefined(base + 7, 3, attribute.endPointNo)
		putIfDefined(base + 10, 1, attribute.endConnected)
		putIfDefined(base + 11, 5, attribute.length)
		putIfDefined(base + 16, 5, attribute.labelX)
		putIfDefined(base + 21, 5, attribute.labelY)
		putIfDefined(base + 26, 2, attribute.kanjiCount)
		putIfDefined(base + 48, 2, attribute.kanaCount)
		putIfDefined(227 + index * 6, 1, attribute.vehicleRestriction)
		putIfDefined(228 + index * 6, 5, attribute.facilityCode)
	})

	put(256, 1, continuation)
	return buffer
}

const createLinkCorrespondenceRecord = (
	links: CorrespondenceLinkSpec[],
	options: {
		node1?: number
		node2?: number
		total?: number
		continuation?: number
	} = {}
): Uint8Array => {
	const {
		node1 = 1,
		node2 = 34,
		total = links.length,
		continuation = 0
	} = options

	const buffer = ebcdic(' '.repeat(RECORD_LENGTH))
	const put = (start: number, length: number, value: number | string) => {
		buffer.set(ebcdic(String(value).padStart(length, '0')), start - 1)
	}
	const putIfDefined = (start: number, length: number, value: number | string | undefined) => {
		if (value === undefined) return
		put(start, length, value)
	}

	put(1, 2, 24)
	put(3, 4, node1)
	put(7, 4, node2)
	put(13, 3, total)

	links.slice(0, 24).forEach((link, index) => {
		const base = 16 + index * 10
		putIfDefined(base, 5, link.node1)
		putIfDefined(base + 5, 5, link.node2)
	})

	put(256, 1, continuation)
	return buffer
}

const concatRecords = (...records: Uint8Array[]): Uint8Array => {
	const output = new Uint8Array(records.length * RECORD_LENGTH)
	records.forEach((record, index) => output.set(record, index * RECORD_LENGTH))
	return output
}

describe('drm parser', () => {
	it('EBCDIC の数字と空白を解釈する', () => {
		expect(decodeEbcdic(ebcdic('01234'))).toBe('01234')
		expect(decodeEbcdic(new Uint8Array([0xf1, 0x40, 0xf2]))).toBe('1 2')
		expect(readInt(ebcdic('00228'), 1, 5)).toBe(228)
		expect(readInt(ebcdic('     '), 1, 5)).toBeNull()
		expect(readText(ebcdic(' 12 '), 1, 4)).toBe('12')
	})

	it('メッシュコードから区画南西端を求める', () => {
		const origin = meshOrigin('624011')

		expect(origin.lon).toBeCloseTo(140.125, 9)
		expect(origin.lat).toBeCloseTo(41.4166667, 6)
		expect(origin.width).toBeCloseTo(1 / 8, 12)
		expect(origin.height).toBeCloseTo(2 / 3 / 8, 12)
	})

	it('ファイル名からメッシュコードを取り出す', () => {
		expect(meshCodeFromFileName('624011.mt')).toBe('624011')
		expect(meshCodeFromFileName('a/b/624011.mt')).toBe('624011')
		expect(meshCodeFromFileName('c\\d\\624011.mt')).toBe('624011')
	})

	it('ノードだけの DRM を点として読む', () => {
		const fc = toGeoJson([
			{
				name: '624011.mt',
				data: concatRecords(
					createBasicNodeRecord({
						nodeNo: 12,
						itemRecordNo: 1,
						x: 5000,
						y: 10000,
						elevation: 23,
						nodeType: 5,
						adjacentMeshCode: 624012,
						adjacentNodeNo: 34,
						connectionCount: 3
					}),
					createBasicNodeRecord({
						nodeNo: 12,
						itemRecordNo: 2,
						x: 9999,
						y: 9999,
						nodeType: 6
					})
				)
			}
		])

		expect(fc.features).toHaveLength(1)

		const pointFeature = fc.features[0]
		expect(pointFeature?.geometry.type).toBe('Point')
		expect(pointFeature?.properties).toMatchObject({
			メッシュコード: '624011',
			ノード番号: '0012',
			標高: 230,
			ノード種別コード: 5,
			ノード種別: '属性変化点ノード',
			隣接メッシュコード: '624012',
			隣接メッシュノード番号: '0034',
			接続リンク本数: 3,
			道路網: '基本道路網'
		})

		const origin = meshOrigin('624011')
		expect(pointFeature?.geometry).toEqual({
			type: 'Point',
			coordinates: [origin.lon + origin.width / 2, origin.lat + origin.height]
		})
	})

	it('基本道路リンクの属性と座標を読む', () => {
		const links = parseMesh(
			createBasicRecord({
				points: [[0, 0], [10000, 10000]],
				mainSubRoad: 1,
				sharedRouteCount: 2,
				sharedRoutes: [
					{ roadType: 4, routeNo: 12, mainSubRoad: 2 },
					{ roadType: 6, routeNo: 88, mainSubRoad: 1 }
				],
				linkType: 2,
				linkPassability: 1,
				roadWidthClass: 2,
				laneCount: 4,
				trafficRegulationType: 3,
				trafficRegulationCondition: 4,
				shapeSource: 2
			}),
			'624011'
		)

		expect(links).toHaveLength(1)
		expect(links[0]?.properties.リンク番号).toBe('00010034')
		expect(links[0]?.properties.管理者コード).toBe(4)
		expect(links[0]?.properties.道路種別コード).toBe(3)
		expect(links[0]?.properties.路線番号).toBe(228)
		expect(links[0]?.properties.主従道路区分コード).toBe(1)
		expect(links[0]?.properties.主従道路区分).toBe('主道路')
		expect(links[0]?.properties.重用路線総数).toBe(2)
		expect(links[0]?.properties.重用路線).toEqual([
			{
				道路種別コード: 4,
				路線番号: 12,
				主従道路区分コード: 2,
				道路種別: '主要地方道（都道府県道）',
				主従道路区分: '従道路'
			},
			{
				道路種別コード: 6,
				路線番号: 88,
				主従道路区分コード: 1,
				道路種別: '一般都道府県道',
				主従道路区分: '主道路'
			}
		])
		expect(links[0]?.properties.リンク種別コード).toBe(2)
		expect(links[0]?.properties.リンク種別).toBe('本線（上下線分離）リンク')
		expect(links[0]?.properties.リンク通行可不可コード).toBe(1)
		expect(links[0]?.properties.リンク通行状態).toBe('自動車通行可')
		expect(links[0]?.properties.道路幅員区分コード).toBe(2)
		expect(links[0]?.properties.道路幅員区分).toBe('幅員5.5m以上13.0m未満')
		expect(links[0]?.properties.車線数コード).toBe(4)
		expect(links[0]?.properties.車線数).toBe('4車線')
		expect(links[0]?.properties.交通規制種別コード).toBe(3)
		expect(links[0]?.properties.交通規制種別).toBe('通行禁止（条件付）')
		expect(links[0]?.properties.交通規制条件種別コード).toBe(4)
		expect(links[0]?.properties.交通規制条件種別).toBe('車種及び時刻')
		expect(links[0]?.properties.形状データ取得資料コード).toBe(2)
		expect(links[0]?.properties.道路管理者).toBe('国')
		expect(links[0]?.properties.道路種別).toBe('一般国道')
		expect(links[0]?.properties.国道分類).toBe('直轄国道')

		const origin = meshOrigin('624011')
		expect(links[0]?.coordinates[0]).toEqual([origin.lon, origin.lat])
		expect(links[0]?.coordinates[1]?.[0]).toBeCloseTo(origin.lon + origin.width, 9)
		expect(links[0]?.coordinates[1]?.[1]).toBeCloseTo(origin.lat + origin.height, 9)
	})

	it('基本道路リンクにリンク内属性と全道路対応を結合する', () => {
		const allRoadRefs = Array.from({ length: 25 }, (_, index) => ({
			node1: index + 1,
			node2: index + 101
		}))
		const data = concatRecords(
			createBasicRecord({ points: [[0, 0], [100, 100]], linkAttributePresence: 1 }),
			createBasicLinkAttributeRecord(
				[
					{
						typeCode: 4,
						displayLevel: 2,
						startPointNo: 1,
						startConnected: 1,
						endPointNo: 3,
						endConnected: 2,
						length: 45,
						labelX: 1200,
						labelY: 3400,
						kanjiCount: 2,
						kanaCount: 4,
						vehicleRestriction: 4,
						facilityCode: 54321
					},
					{
						typeCode: 8,
						displayLevel: 3,
						startPointNo: 3,
						endPointNo: 8,
						length: 320
					},
					{
						typeCode: 12,
						displayLevel: 1,
						startPointNo: 8,
						endPointNo: 9,
						length: 15,
						facilityCode: 99999
					}
				],
				{ total: 4, continuation: 1 }
			),
			createBasicLinkAttributeRecord(
				[
					{
						typeCode: 13,
						displayLevel: 1,
						startPointNo: 9,
						endPointNo: 10,
						length: 30
					}
				],
				{ total: 0, node1: 1, node2: 34 }
			),
			createLinkCorrespondenceRecord(allRoadRefs.slice(0, 24), { total: 25, continuation: 1 }),
			createLinkCorrespondenceRecord(allRoadRefs.slice(24), { total: 0, node1: 1, node2: 34 })
		)

		const links = parseMesh(data, '624011')

		expect(links).toHaveLength(1)
		expect(links[0]?.properties.リンク内属性総数).toBe(4)
		expect(links[0]?.properties.リンク内属性).toHaveLength(4)
		expect(links[0]?.properties.リンク内属性?.[0]).toEqual({
			属性種別コード: 4,
			属性種別: '踏切',
			表示レベル参考コード: 2,
			始点補間点番号: 1,
			始点側接続有無コード: 1,
			終点補間点番号: 3,
			終点側接続有無コード: 2,
			属性延長: 45,
			属性名称表示参考位置X座標: 1200,
			属性名称表示参考位置Y座標: 3400,
			漢字文字数: 2,
			カナ文字数: 4,
			車両通行規制コード: 4,
			車両通行規制: '車両通行不可',
			施設管理コード: 54321
		})
		expect(links[0]?.properties.リンク内属性?.[3]?.属性種別).toBe('日本風景街道')
		expect(links[0]?.properties.対応全道路リンク総数).toBe(25)
		expect(links[0]?.properties.対応全道路リンク番号一覧).toHaveLength(25)
		expect(links[0]?.properties.対応全道路リンク番号一覧?.[0]).toBe('0000100101')
		expect(links[0]?.properties.対応全道路リンク番号一覧?.[24]).toBe('0002500125')
	})

	it('継続レコードを連結する', () => {
		const firstPoints: [number, number][] = Array.from({ length: 16 }, (_, index) => [
			(index + 1) * 100,
			(index + 1) * 100
		])
		const data = concatRecords(
			createBasicRecord({
				points: firstPoints,
				pointTotal: 18,
				continuation: 1,
				sharedRouteCount: 4,
				sharedRoutes: [
					{ roadType: 4, routeNo: 12, mainSubRoad: 2 },
					{ roadType: 6, routeNo: 88, mainSubRoad: 1 },
					{ roadType: 9, routeNo: 7, mainSubRoad: 2 }
				]
			}),
			createBasicRecord({
				useDefaultCoreFields: false,
				points: [
					[1700, 1700],
					[1800, 1800]
				],
				sharedRoutes: [{ roadType: 3, routeNo: 228, mainSubRoad: 1 }]
			})
		)

		const links = parseMesh(data, '624011')

		expect(links).toHaveLength(1)
		expect(links[0]?.coordinates).toHaveLength(18)
		expect(links[0]?.properties.道路種別コード).toBe(3)
		expect(links[0]?.properties.重用路線).toHaveLength(4)
		expect(links[0]?.properties.重用路線?.[3]).toEqual({
			道路種別コード: 3,
			路線番号: 228,
			主従道路区分コード: 1,
			道路種別: '一般国道',
			主従道路区分: '主道路'
		})
	})

	it('全道路リンクを別レイアウトで読む', () => {
		const links = parseMesh(
			createAllRoadRecord({
				manager: 5,
				roadType: 9,
				roadWidthClass: 3,
				laneCount: 2,
				trafficRegulationType: 4,
				trafficRegulationCondition: 2,
				basicLinkNode1: 1234,
				basicLinkNode2: 5678,
				linkAttributePresence: 1,
				linkPassability: 2,
				shapeSource: 3,
				points: [[100, 100], [200, 200]]
			}),
			'624011',
			{ recordId: RECORD_ID_ALL_LINK }
		)

		expect(links).toHaveLength(1)
		expect(links[0]?.properties.管理者コード).toBe(5)
		expect(links[0]?.properties.道路種別コード).toBe(9)
		expect(links[0]?.properties.道路種別).toBe('その他の道路')
		expect(links[0]?.properties.道路網).toBe('全道路網')
		expect(links[0]?.properties.路線番号).toBeUndefined()
		expect(links[0]?.properties.指定区間該当).toBeUndefined()
		expect(links[0]?.properties.道路幅員区分コード).toBe(3)
		expect(links[0]?.properties.道路幅員区分).toBe('幅員3.0m以上5.5m未満')
		expect(links[0]?.properties.車線数コード).toBe(2)
		expect(links[0]?.properties.車線数).toBe('2車線')
		expect(links[0]?.properties.交通規制種別コード).toBe(4)
		expect(links[0]?.properties.交通規制種別).toBe('一方通行（正方向、条件無）')
		expect(links[0]?.properties.交通規制条件種別コード).toBe(2)
		expect(links[0]?.properties.交通規制条件種別).toBe('時刻のみ')
		expect(links[0]?.properties.対応基本道路ノード1).toBe('1234')
		expect(links[0]?.properties.対応基本道路ノード2).toBe('5678')
		expect(links[0]?.properties.対応基本道路リンク番号).toBe('12345678')
		expect(links[0]?.properties.リンク内属性有無コード).toBe(1)
		expect(links[0]?.properties.リンク通行可不可コード).toBe(2)
		expect(links[0]?.properties.リンク通行状態).toBe('自動車通行不可')
		expect(links[0]?.properties.形状データ取得資料コード).toBe(3)
	})

	it('全道路リンクに全道路リンク内属性を結合する', () => {
		const data = concatRecords(
			createAllRoadRecord({
				points: [[100, 100], [200, 200]],
				linkAttributePresence: 1
			}),
			createAllRoadLinkAttributeRecord([
				{
					typeCode: 7,
					displayLevel: 2,
					startPointNo: 1,
					endPointNo: 2,
					length: 20
				},
				{
					typeCode: 10,
					displayLevel: 2,
					startPointNo: 2,
					endPointNo: 4,
					length: 30
				}
			])
		)

		const links = parseMesh(data, '624011', { recordId: RECORD_ID_ALL_LINK })

		expect(links).toHaveLength(1)
		expect(links[0]?.properties.リンク内属性総数).toBe(2)
		expect(links[0]?.properties.リンク内属性).toEqual([
			{
				属性種別コード: 7,
				属性種別: '料金所（ETC無し）',
				表示レベル参考コード: 2,
				始点補間点番号: 1,
				始点側接続有無コード: null,
				終点補間点番号: 2,
				終点側接続有無コード: null,
				属性延長: 20,
				属性名称表示参考位置X座標: null,
				属性名称表示参考位置Y座標: null,
				漢字文字数: null,
				カナ文字数: null,
				車両通行規制コード: null,
				車両通行規制: null,
				施設管理コード: null
			},
			{
				属性種別コード: 10,
				属性種別: '料金所（ETC専用）',
				表示レベル参考コード: 2,
				始点補間点番号: 2,
				始点側接続有無コード: null,
				終点補間点番号: 4,
				終点側接続有無コード: null,
				属性延長: 30,
				属性名称表示参考位置X座標: null,
				属性名称表示参考位置Y座標: null,
				漢字文字数: null,
				カナ文字数: null,
				車両通行規制コード: null,
				車両通行規制: null,
				施設管理コード: null
			}
		])
	})

	it('includeAllRoads で両方の道路網を読む', () => {
		const data = concatRecords(
			createBasicRecord({ points: [[1, 1], [2, 2]] }),
			createAllRoadRecord({ points: [[3, 3], [4, 4]] })
		)

		expect(parseMesh(data, '624011')).toHaveLength(1)
		expect(parseMesh(data, '624011', { includeAllRoads: true })).toHaveLength(2)
	})

	it('国道分類と測地系を判定する', () => {
		expect(classifyNationalRoad('一般国道', '国')).toBe('直轄国道')
		expect(classifyNationalRoad('一般国道', '都道府県')).toBe('補助国道')
		expect(classifyNationalRoad('高速自動車国道', '国')).toBeNull()

		expect(detectCrs('3803Asono1_ho')).toBe(CRS_TOKYO)
		expect(detectCrs('drm3803_EBCDIC')).toBe(CRS_JGD2000)
		expect(detectCrs('624011.mt')).toBe(CRS_TOKYO)
		expect(
			detectCrsCandidates(
				'drm3803A_EBCDIC_01北海道/3803Asono1_ho/624011.mt',
				'drm3803_EBCDIC_01北海道/3803sono1_ho/624012.mt'
			)
		).toEqual([CRS_TOKYO, CRS_JGD2000])
	})

	it('GeoJSON にまとめて、相対パス名を優先する', () => {
		const fc = toGeoJson([
			{
				name: 'drm3803A_EBCDIC_01北海道/3803Asono1_ho/624011.mt',
				data: createBasicRecord({ points: [[0, 0], [5000, 5000]] })
			}
		])

		expect(fc.type).toBe('FeatureCollection')
		expect(fc.crs).toBe(CRS_TOKYO)
		expect(fc.features).toHaveLength(1)
		expect(fc.features[0]?.geometry.type).toBe('LineString')
		expect(fc.features[0]?.properties.メッシュコード).toBe('624011')

		const file = new File(['x'], '624011.mt')
		Object.defineProperty(file, 'morivisRelativePath', {
			value: 'drm3803A_EBCDIC_01北海道/3803Asono1_ho/624011.mt',
			configurable: true
		})
		expect(getDrmInputName(file)).toBe('drm3803A_EBCDIC_01北海道/3803Asono1_ho/624011.mt')
	})

	it('全道路ノードも includeAllRoads で点にする', () => {
		const fc = toGeoJson(
			[
				{
					name: '624011.mt',
					data: createAllRoadNodeRecord({
						nodeNo: 123,
						x: 2500,
						y: 7500,
						nodeType: 2,
						adjacentMeshCode: 624012,
						adjacentNodeNo: 456,
						connectionCount: 2
					})
				}
			],
			{ includeAllRoads: true }
		)

		expect(fc.features).toHaveLength(1)
		expect(fc.features[0]?.geometry.type).toBe('Point')
		expect(fc.features[0]?.properties).toMatchObject({
			ノード番号: '00123',
			ノード種別: '行き止まり点ノード',
			道路網: '全道路網'
		})
	})

	it('nationalRoadsOnly で一般国道だけに絞る', () => {
		const data = concatRecords(
			createBasicRecord({ roadType: 3, manager: 4, points: [[1, 1], [2, 2]] }),
			createBasicRecord({ roadType: 9, manager: 7, points: [[3, 3], [4, 4]] })
		)

		const all = toGeoJson([{ name: '624011.mt', data }])
		const onlyNational = toGeoJson([{ name: '624011.mt', data }], { nationalRoadsOnly: true })

		expect(all.features).toHaveLength(2)
		expect(onlyNational.features).toHaveLength(1)
		expect(onlyNational.features[0]?.properties).toMatchObject({ 国道分類: '直轄国道' })
	})

	it('線とノードが混在すると線を優先する', () => {
		const fc = toGeoJson([
			{
				name: '624011.mt',
				data: concatRecords(
					createBasicNodeRecord({ nodeNo: 5, x: 1000, y: 1000 }),
					createBasicRecord({ points: [[0, 0], [100, 100]] })
				)
			}
		])

		expect(fc.features).toHaveLength(1)
		expect(fc.features[0]?.geometry.type).toBe('LineString')
	})

	it('不正なレコード長と未定義レコードIDを弾く', () => {
		expect(() => parseMesh(new Uint8Array(100), '624011')).toThrow(/レコード長/)
		expect(() => parseMesh(createBasicRecord(), '624011', { recordId: '99' })).toThrow(/未定義/)
	})
})
