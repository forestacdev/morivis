# MITABの参照・移植箇所

`src/routes/map/utils/formats/mapinfo-tab/`はGDAL 3.8.4のMITABを参照し、バイナリの読み取り、図形構築、楕円体ID・投影定義をTypeScriptへ実装したもの。GDALバイナリやWASMは同梱しない。

参照元: https://github.com/OSGeo/gdal/tree/v3.8.4/ogr/ogrsf_frmts/mitab

対象: mitab_datfile.cpp、mitab_mapheaderblock.cpp、mitab_mapobjectblock.cpp、mitab_mapcoordblock.cpp、mitab_feature.cpp、mitab_spatialref.cpp。MITライセンスの著作権表示・許諾文をLICENSE.txtに保持する。
