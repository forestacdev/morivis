"""Fictional S-57 ENC cells. Run from the repository root; no real chart inputs."""
from pathlib import Path
import struct

ROOT = Path(__file__).parent
UT = b'\x1f'
FT = b'\x1e'
u8 = lambda x: struct.pack('<B', x)
u16 = lambda x: struct.pack('<H', x)
u32 = lambda x: struct.pack('<I', x)
text = lambda x: x.encode('ascii') + UT

# Independent copies of the S-57 Part 3 field descriptions, including a DDR tree.
DEFINITIONS = {
    '0001': ('', 'b12'),
    'DSID': ('RCNM!RCID!EXPP!INTU!DSNM!EDTN!UPDN!UADT!ISDT!STED!PRSP!PSDN!PRED!PROF!AGEN!COMT', 'b11,b14,2b11,3A,2A(8),R(4),b11,2A,b11,b12,A'),
    'DSSI': ('DSTR!AALL!NALL!NOMR!NOCR!NOGR!NOLR!NOIN!NOCN!NOED!NOFA', '3b11,8b14'),
    'DSPM': ('RCNM!RCID!HDAT!VDAT!SDAT!CSCL!DUNI!HUNI!PUNI!COUN!COMF!SOMF!COMT', 'b11,b14,3b11,b14,4b11,2b14,A'),
    'VRID': ('RCNM!RCID!RVER!RUIN', 'b11,b14,b12,b11'),
    'SG2D': ('*YCOO!XCOO', '2b24'),
    'SG3D': ('*YCOO!XCOO!VE3D', '3b24'),
    'VRPT': ('*NAME!ORNT!USAG!TOPI!MASK', 'B(40),4b11'),
    'FRID': ('RCNM!RCID!PRIM!GRUP!OBJL!RVER!RUIN', 'b11,b14,2b11,2b12,b11'),
    'FOID': ('AGEN!FIDN!FIDS', 'b12,b14,b12'),
    'ATTF': ('*ATTL!ATVL', 'b12,A'),
    'NATF': ('*ATTL!ATVL', 'b12,A'),
    'FSPT': ('*NAME!ORNT!USAG!MASK', 'B(40),3b11'),
    'FFPT': ('*LNAM!RIND!COMT', 'B(64),b11,A'),
    'ATTV': ('*ATTL!ATVL', 'b12,A'),
    'FSPC': ('FSUI!FSIX!NSPT', 'b11,2b12'),
    'FFPC': ('FFUI!FFIX!NFPT', 'b11,2b12'),
    'VRPC': ('VPUI!VPIX!NVPT', 'b11,2b12'),
    'SGCC': ('CCUI!CCIX!CCNC', 'b11,2b12'),
}


def record(fields, ddr=False):
    fields = [(tag, value if tag == 'NATF' and value.endswith(FT + b'\0') else value + FT) for tag, value in fields]
    length_width = 5
    position_width = 5
    base = 24 + len(fields) * (4 + length_width + position_width) + 1
    length = base + sum(len(value) for _, value in fields)
    leader = bytearray(b'00000 D     00000   5504')
    leader[0:5] = f'{length if length < 100000 else 0:05d}'.encode()
    leader[12:17] = f'{base:05d}'.encode()
    if ddr:
        leader[5:12] = b'3LE1 09'
        leader[17:20] = b' ! '
    directory = bytearray()
    offset = 0
    for tag, value in fields:
        directory += tag.encode() + f'{len(value):05d}{offset:05d}'.encode()
        offset += len(value)
    return bytes(leader) + directory + FT + b''.join(value for _, value in fields)


def definitions(update=False):
    tree = '0001DSIDDSIDDSSI0001DSPM0001VRIDVRIDSG2DVRIDSG3DVRIDVRPT0001FRIDFRIDFOIDFRIDATTFFRIDNATFFRIDFSPTFRIDFFPT'
    ddr = [('0000', b'0000;&   ' + text('test-chart') + tree.encode())]
    tree += 'FRIDFSPCFRIDFFPCVRIDVRPCVRIDSGCCVRIDATTV'
    if update:
        tree = tree.replace('0001DSPM', '')
    ddr[0] = ('0000', b'0000;&   ' + text('test-chart') + tree.encode())
    for tag, (labels, fmt) in DEFINITIONS.items():
        if update and tag == 'DSPM':
            continue
        control = b'0500;&   ' if tag == '0001' else b'2600;&   ' if labels.startswith('*') else b'1600;&   '
        ddr.append((tag, control + text('test-' + tag) + text(labels) + f'({fmt})'.encode()))
    return record(ddr, True)


def chart(name, national_level=2):
    records = [definitions()]
    serial = 0

    def add(fields):
        nonlocal serial
        serial += 1
        records.append(record([('0001', u16(serial))] + fields))

    dsid = u8(10) + u32(1) + bytes([1, 4]) + text(name) + text('1') + text('0')
    dsid += b'200001012000010103.1' + u8(1) + text('') + text('2.0') + u8(1) + u16(999) + text('test-fictional')
    # ENC Product Specification uses Chain-node (DSTR=2).
    add([('DSID', dsid), ('DSSI', bytes([2, 1, national_level]) + struct.pack('<8I', 0, 0, 4, 1, 2, 8, 8, 0))])
    add([('DSPM', u8(20) + u32(1) + bytes([2, 16, 16]) + u32(10000) + bytes([1, 1, 1, 1]) + u32(1000000) + u32(10) + text('test'))])

    def vector(kind, ident, fields):
        add([('VRID', u8(kind) + u32(ident) + u16(1) + u8(1))] + fields)

    # Outer and inner squares at arbitrary unit coordinates. Edges omit endpoint coordinates.
    xy = [(1, 1), (4, 1), (4, 4), (1, 4), (2, 2), (3, 2), (3, 3), (2, 3)]
    for ident, (x, y) in enumerate(xy, 1):
        vector(120, ident, [('SG2D', struct.pack('<ii', y * 1000000, x * 1000000))])
    for ident, start, end in [(1, 1, 2), (2, 2, 3), (3, 3, 4), (4, 4, 1), (5, 5, 6), (6, 6, 7), (7, 7, 8), (8, 8, 5)]:
        vrpt = b''.join(u8(120) + u32(node) + bytes([255, 255, topo, 255]) for node, topo in [(start, 1), (end, 2)])
        fields = [('VRPT', vrpt)]
        if ident == 1:
            fields += [('SG2D', struct.pack('<ii', 1000000, 1500000))]
        vector(130, ident, fields)
    vector(110, 1, [('SG3D', struct.pack('<iii', 1250000, 1250000, 123)), ('SG3D', struct.pack('<iii', 1750000, 1750000, -5))])
    vector(110, 2, [('SG2D', struct.pack('<ii', 1250000, 1500000))])

    def feature(ident, primitive, objl, pointers, attrs=None, extra=None):
        fields = [('FRID', u8(100) + u32(ident) + bytes([primitive, 2]) + u16(objl) + u16(1) + u8(1)),
                  ('FOID', u16(999) + u32(ident) + u16(1))]
        if pointers:
            fields += [('FSPT', b''.join(u8(kind) + u32(ref) + bytes([orientation, usage, 2]) for kind, ref, orientation, usage in pointers))]
        if attrs:
            fields += [('ATTF', b''.join(u16(code) + value.encode('latin1') + UT for code, value in attrs))]
        add(fields + (extra or []))

    feature(1, 3, 42, [(130, i, 1, 1 if i < 5 else 2) for i in range(1, 9)], [(87, '1.5'), (88, '20'), (116, 'test-area')])
    feature(2, 2, 30, [(130, 2, 2, 255), (130, 1, 2, 255)], [(116, 'test-line')])
    feature(3, 1, 129, [(110, 1, 255, 255)], [(116, 'test-sounding')])
    national = ('test-架空' if national_level == 2 else 'test-café').encode('utf-16le' if national_level == 2 else 'latin1')
    national += b'\x1f\0\x1e\0' if national_level == 2 else UT
    feature(4, 1, 75, [(110, 2, 255, 255)], [(75, '3,4'), (116, 'test-café'), (65000, 'test-unknown')],
            [('NATF', u16(301) + national), ('FFPT', u16(999) + u32(3) + u16(1) + u8(1) + text('test-relation'))])
    feature(5, 255, 400, [], [(116, 'test-collection')])
    return b''.join(records)


def updates(number):
    records = [definitions(True)]
    serial = 0

    def add(fields):
        nonlocal serial
        serial += 1
        records.append(record([('0001', u16(serial))] + fields))

    dsid = u8(10) + u32(1) + bytes([2, 4]) + text(f'test-chart.{number:03d}') + text('1') + text(str(number))
    dsid += b'20000101' + f'200001{number + 1:02d}'.encode() + b'03.1' + u8(1) + text('') + text('2.0') + u8(2) + u16(999) + text('test-update')
    add([('DSID', dsid), ('DSSI', bytes([2, 1, 2]) + struct.pack('<8I', 0, 0, 0, 0, 0, 0, 0, 0))])

    def vector(kind, ident, version, operation, fields):
        add([('VRID', u8(kind) + u32(ident) + u16(version) + u8(operation))] + fields)

    def feature(ident, primitive, objl, version, operation, fields):
        add([('FRID', u8(100) + u32(ident) + bytes([primitive, 2]) + u16(objl) + u16(version) + u8(operation))] + fields)

    control = lambda operation, index, count: u8(operation) + u16(index) + u16(count)
    pointer = lambda kind, ident: u8(kind) + u32(ident) + bytes([255, 255, 2])
    relation = lambda ident, comment: u16(999) + u32(ident) + u16(1) + u8(1) + text(comment)
    if number == 1:
        vector(110, 1, 2, 3, [('SGCC', control(3, 1, 1)), ('SG3D', struct.pack('<iii', 1250000, 1250000, 456))])
        vector(130, 1, 2, 3, [('SGCC', control(1, 2, 1)), ('SG2D', struct.pack('<ii', 1000000, 1750000))])
        vector(130, 2, 2, 3, [('SG2D', struct.pack('<ii', 2000000, 4000000))])
        vector(120, 9, 1, 1, [('SG2D', struct.pack('<ii', 2000000, 2000000))])
        vector(130, 8, 2, 3, [('VRPC', control(3, 2, 1)), ('VRPT', u8(120) + u32(9) + bytes([255, 255, 2, 255]))])
        vector(110, 3, 1, 1, [('SG2D', struct.pack('<ii', 1500000, 2500000))])
        feature(4, 1, 75, 2, 3, [
            ('FOID', u16(999) + u32(4) + u16(1)),
            ('ATTF', u16(116) + text('test-updated') + u16(75) + b'\x7f' + UT + u16(102) + text('test-new')),
            ('NATF', u16(301) + 'test-更新'.encode('utf-16le') + b'\x1f\0\x1e\0'),
            ('FSPC', control(3, 1, 1)), ('FSPT', pointer(110, 3)),
            ('FFPC', control(3, 1, 1)), ('FFPT', relation(6, 'test-replaced'))])
        feature(6, 1, 75, 1, 1, [('FOID', u16(999) + u32(6) + u16(1)), ('FSPT', pointer(110, 3)), ('ATTF', u16(116) + text('test-added'))])
        feature(2, 2, 30, 2, 2, [])
        vector(110, 2, 2, 2, [])
    else:
        vector(110, 1, 3, 3, [('SGCC', control(2, 2, 1))])
        feature(4, 1, 75, 3, 3, [('NATF', u16(301) + b'\x7f\0\x1f\0\x1e\0'), ('FFPC', control(2, 1, 1))])
        feature(4, 1, 75, 4, 3, [('FFPC', control(1, 1, 1)), ('FFPT', relation(3, 'test-inserted'))])
        feature(6, 1, 75, 2, 3, [('FSPC', control(1, 2, 1)), ('FSPT', pointer(110, 1))])
        feature(6, 1, 75, 3, 3, [('FSPC', control(2, 1, 1))])
    return b''.join(records)


if __name__ == '__main__':
    (ROOT / 'test-chart.000').write_bytes(chart('test-chart'))
    (ROOT / 'test-other.000').write_bytes(chart('test-other', 1))
    (ROOT / 'test-chart.001').write_bytes(updates(1))
    (ROOT / 'test-chart.002').write_bytes(updates(2))
