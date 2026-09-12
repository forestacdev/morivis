<?xml version="1.0" encoding="UTF-8"?>
<c:CityModel xmlns:c="http://www.opengis.net/citygml/2.0"
 xmlns:b="http://www.opengis.net/citygml/building/2.0"
 xmlns:g="http://www.opengis.net/gml" xmlns:x="http://www.w3.org/1999/xlink"
 xmlns:gen="http://www.opengis.net/citygml/generics/2.0">
 <g:boundedBy><g:Envelope srsName="http://www.opengis.net/def/crs/EPSG/0/6697" srsDimension="3">
  <g:lowerCorner>10 20 3</g:lowerCorner><g:upperCorner>10.003 20.003 8</g:upperCorner>
 </g:Envelope></g:boundedBy>
 <c:cityObjectMember><b:Building g:id="test-building-a">
  <g:name>test-building</g:name><b:measuredHeight uom="m">5</b:measuredHeight>
  <gen:stringAttribute name="test-purpose"><gen:value>test-use</gen:value></gen:stringAttribute>
  <b:lod1Solid><g:Solid><g:exterior><g:CompositeSurface><g:surfaceMember>
   <g:Polygon g:id="test-lod1"><g:exterior><g:LinearRing><g:posList>
    10 20 3 10 20.001 3 10.001 20.001 3 10.001 20 3 10 20 3
   </g:posList></g:LinearRing></g:exterior></g:Polygon>
  </g:surfaceMember></g:CompositeSurface></g:exterior></g:Solid></b:lod1Solid>
  <b:lod2Solid><g:Solid><g:exterior><g:CompositeSurface>
   <g:surfaceMember x:href="#test-wall"/><g:surfaceMember x:href="#test-roof"/>
   <g:surfaceMember x:href="#test-wall"/>
  </g:CompositeSurface></g:exterior></g:Solid></b:lod2Solid>
  <b:boundedBy><b:WallSurface><b:lod2MultiSurface><g:MultiSurface><g:surfaceMember>
   <g:Polygon g:id="test-wall"><g:exterior><g:LinearRing><g:posList count="5">
    10 20 3 10 20.001 3 10 20.001 8 10 20 8 10 20 3
   </g:posList></g:LinearRing></g:exterior></g:Polygon>
  </g:surfaceMember></g:MultiSurface></b:lod2MultiSurface></b:WallSurface></b:boundedBy>
  <b:boundedBy><b:RoofSurface><b:lod2MultiSurface><g:MultiSurface><g:surfaceMember>
   <g:Polygon g:id="test-roof"><g:exterior><g:LinearRing><g:posList>
    10 20 8 10 20.001 8 10.001 20.001 8 10.001 20 8 10 20 8
   </g:posList></g:LinearRing></g:exterior><g:interior><g:LinearRing><g:posList>
    10.0002 20.0002 8 10.0008 20.0002 8 10.0008 20.0008 8 10.0002 20.0008 8 10.0002 20.0002 8
   </g:posList></g:LinearRing></g:interior></g:Polygon>
  </g:surfaceMember></g:MultiSurface></b:lod2MultiSurface></b:RoofSurface></b:boundedBy>
 </b:Building></c:cityObjectMember>
 <c:cityObjectMember><b:Building g:id="test-building-b"><b:lod1MultiSurface><g:MultiSurface><g:surfaceMember>
  <g:Triangle><g:exterior><g:LinearRing>
   <g:pos>10.002 20.002 3</g:pos><g:pos>10.002 20.003 3</g:pos><g:pos>10.003 20.002 4</g:pos><g:pos>10.002 20.002 3</g:pos>
  </g:LinearRing></g:exterior></g:Triangle>
 </g:surfaceMember></g:MultiSurface></b:lod1MultiSurface></b:Building></c:cityObjectMember>
</c:CityModel>
