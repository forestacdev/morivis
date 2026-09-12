<CityModel xmlns="http://www.opengis.net/citygml/2.0"
 xmlns:b="http://www.opengis.net/citygml/building/2.0" xmlns:g="http://www.opengis.net/gml">
 <g:boundedBy><g:Envelope srsName="urn:ogc:def:crs:EPSG::6697" srsDimension="3"/></g:boundedBy>
 <cityObjectMember><b:Building g:id="test-parent"><g:name>test-parent-name</g:name>
  <b:consistsOfBuildingPart><b:BuildingPart g:id="test-part">
   <g:name>test-part-name</g:name>
   <b:lod2MultiSurface><g:MultiSurface srsName="urn:ogc:def:crs:OGC:1.3:CRS84"><g:surfaceMember>
    <g:Polygon><g:exterior><g:LinearRing><g:posList>
     20 10 2 20.001 10 2 20.001 10 7 20 10 7 20 10 2
    </g:posList></g:LinearRing></g:exterior></g:Polygon>
   </g:surfaceMember></g:MultiSurface></b:lod2MultiSurface>
  </b:BuildingPart></b:consistsOfBuildingPart>
 </b:Building></cityObjectMember>
</CityModel>
