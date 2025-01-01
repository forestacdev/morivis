//★クリックイベント

//アイコン
map.on("click", "mapicon", (e) => {

    const bearingnow = Math.round(map.getBearing());

    map.fitBounds(
        [
        [136.915292, 35.547079], // southwestern corner of the bounds
        [136.926577, 35.556588] // northeastern corner of the bounds
        ],
        {
        bearing: bearingnow,
        duration: 3000,
        },
        );
    e.stopPropagation();
});

map.on("mouseenter", "mapicon", () => {
    map.getCanvas().style.cursor = "pointer";
});
map.on("mouseleave", "mapicon", () => {
    map.getCanvas().style.cursor = "";
});


map.on("click", "360度写真", (e) => {
    new mapboxgl.Popup()
    .setLngLat(e.features[0].geometry.coordinates)
    .setHTML(
        "<h3><img src='https://img.icons8.com/ios-glyphs/25/ffffff/360-view.png'/> " +
        e.features[0].properties.Name +
        "</h3><iframe width='100%' height='auto' allowfullscreen style='border-style:none;' src='https://cdn.pannellum.org/2.5/pannellum.htm#panorama=" +
        e.features[0].properties.image360 +
        "&autoLoad=true&autoRotate=-8'></iframe><br>撮影日：" +
        e.features[0].properties.Timestamp
        )
    .addTo(map);
    map.flyTo({ 
        center: e.features[0].geometry.coordinates,
        duration: 1000,  
    });
    e.stopPropagation();
});
map.on("mouseenter", "360度写真", () => {
    map.getCanvas().style.cursor = "pointer";
});
map.on("mouseleave", "360度写真", () => {
    map.getCanvas().style.cursor = "";
});

map.on("click", "美濃市指定避難場所", (e) => {
    new mapboxgl.Popup()
    .setLngLat(e.features[0].geometry.coordinates)
    .setHTML(
        "<h3>" + 
        e.features[0].properties.名称 +
        "</h3>" +
        e.features[0].properties.住所 +
        "<br>" +
        e.features[0].properties.電話番号 +
        "<hr>想定収容人数<br><h2>" +
        e.features[0].properties.想定収容人数 +
        "</h2>"
    )
    .addTo(map);
    map.flyTo({ 
        center: e.features[0].geometry.coordinates,
        duration: 1000,  
    });
    e.stopPropagation();
});
map.on("mouseenter", "美濃市指定避難場所", () => {
    map.getCanvas().style.cursor = "pointer";
});
map.on("mouseleave", "美濃市指定避難場所", () => {
    map.getCanvas().style.cursor = "";
});

map.on("click", "美濃市指定緊急避難場所", (e) => {
    new mapboxgl.Popup()
    .setLngLat(e.features[0].geometry.coordinates)
    .setHTML(
    "<h3>" + 
    e.features[0].properties.名称 +
    "</h3>" +
    e.features[0].properties.住所 +
    "<br>" +
    e.features[0].properties.電話番号 +
    "<hr>想定収容人数<br><h2>" +
    e.features[0].properties.想定収容人数 +
    "</h2>"
    )
    .addTo(map);
    map.flyTo({ 
        center: e.features[0].geometry.coordinates,
        duration: 1000,  
    });
    e.stopPropagation();
});
map.on("mouseenter", "美濃市指定緊急避難場所", () => {
    map.getCanvas().style.cursor = "pointer";
});
map.on("mouseleave", "美濃市指定緊急避難場所", () => {
    map.getCanvas().style.cursor = "";
});

map.on("click", "森林環境教育専攻-フェノロジー調査2020-植物", (e) => {
    new mapboxgl.Popup()
    .setLngLat(e.features[0].geometry.coordinates)
    .setHTML(
    "<h3>" + 
    e.features[0].properties.種名 +
    "</h3>" +
    "<a href='http://ja.wikipedia.org/wiki/" +
    e.features[0].properties.種名 +
    "' target='_blank' rel='noopener noreferrer'>ウィキペディアで調べる</a><hr>日時：" +
    e.features[0].properties.日時 +
    "<br>場所：" +
    e.features[0].properties.場所 +
    "<br>状態：" +
    e.features[0].properties.状態 +
    "<style>a { color:rgb(89, 235, 89); }</style>"
    )
    .addTo(map);
    map.flyTo({ 
        center: e.features[0].geometry.coordinates,
        duration: 1000,  
    });
    e.stopPropagation();
});
map.on("mouseenter", "森林環境教育専攻-フェノロジー調査2020-植物", () => {
    map.getCanvas().style.cursor = "pointer";
});
map.on("mouseleave", "森林環境教育専攻-フェノロジー調査2020-植物", () => {
    map.getCanvas().style.cursor = "";
});

map.on("click", "森林環境教育専攻-フェノロジー調査2020-昆虫", (e) => {
    new mapboxgl.Popup()
    .setLngLat(e.features[0].geometry.coordinates)
    .setHTML(
    "<h3>" + 
    e.features[0].properties.種名 +
    "</h3>" +
    "<a href='http://ja.wikipedia.org/wiki/" +
    e.features[0].properties.種名 +
    "' target='_blank' rel='noopener noreferrer'>ウィキペディアで調べる</a><hr>日時：" +
    e.features[0].properties.日時 +
    "<br>場所：" +
    e.features[0].properties.場所 +
    "<br>状態：" +
    e.features[0].properties.状態 +
    "<style>a { color:rgb(89, 235, 89); }</style>"
    )
    .addTo(map);
    map.flyTo({ 
        center: e.features[0].geometry.coordinates,
        duration: 1000,  
    });
    e.stopPropagation();
});
map.on("mouseenter", "森林環境教育専攻-フェノロジー調査2020-昆虫", () => {
    map.getCanvas().style.cursor = "pointer";
});
map.on("mouseleave", "森林環境教育専攻-フェノロジー調査2020-昆虫", () => {
    map.getCanvas().style.cursor = "";
});

map.on("click", "森林環境教育専攻-フェノロジー調査2020-哺乳類", (e) => {
    new mapboxgl.Popup()
    .setLngLat(e.features[0].geometry.coordinates)
    .setHTML(
    "<h3>" + 
    e.features[0].properties.種名 +
    "</h3>" +
    "<a href='http://ja.wikipedia.org/wiki/" +
    e.features[0].properties.種名 +
    "' target='_blank' rel='noopener noreferrer'>ウィキペディアで調べる</a><hr>日時：" +
    e.features[0].properties.日時 +
    "<br>場所：" +
    e.features[0].properties.場所 +
    "<br>状態：" +
    e.features[0].properties.状態 +
    "<style>a { color:rgb(89, 235, 89); }</style>"
    )
    .addTo(map);
    map.flyTo({ 
        center: e.features[0].geometry.coordinates,
        duration: 1000,  
    });
    e.stopPropagation();
});
map.on("mouseenter", "森林環境教育専攻-フェノロジー調査2020-哺乳類", () => {
    map.getCanvas().style.cursor = "pointer";
});
map.on("mouseleave", "森林環境教育専攻-フェノロジー調査2020-哺乳類", () => {
    map.getCanvas().style.cursor = "";
});

map.on("click", "森林環境教育専攻-フェノロジー調査2020-鳥類", (e) => {
    new mapboxgl.Popup()
    .setLngLat(e.features[0].geometry.coordinates)
    .setHTML(
    "<h3>" + 
    e.features[0].properties.種名 +
    "</h3>" +
    "<a href='http://ja.wikipedia.org/wiki/" +
    e.features[0].properties.種名 +
    "' target='_blank' rel='noopener noreferrer'>ウィキペディアで調べる</a><hr>日時：" +
    e.features[0].properties.日時 +
    "<br>場所：" +
    e.features[0].properties.場所 +
    "<br>状態：" +
    e.features[0].properties.状態 +
    "<style>a { color:rgb(89, 235, 89); }</style>"
    )
    .addTo(map);
    map.flyTo({ 
        center: e.features[0].geometry.coordinates,
        duration: 1000,  
    });
    e.stopPropagation();
});
map.on("mouseenter", "森林環境教育専攻-フェノロジー調査2020-鳥類", () => {
    map.getCanvas().style.cursor = "pointer";
});
map.on("mouseleave", "森林環境教育専攻-フェノロジー調査2020-鳥類", () => {
    map.getCanvas().style.cursor = "";
});

map.on("click", "森林環境教育専攻-フェノロジー調査2020-菌類", (e) => {
    new mapboxgl.Popup()
    .setLngLat(e.features[0].geometry.coordinates)
    .setHTML(
    "<h3>" + 
    e.features[0].properties.種名 +
    "</h3>" +
    "<a href='http://ja.wikipedia.org/wiki/" +
    e.features[0].properties.種名 +
    "' target='_blank' rel='noopener noreferrer'>ウィキペディアで調べる</a><hr>日時：" +
    e.features[0].properties.日時 +
    "<br>場所：" +
    e.features[0].properties.場所 +
    "<br>状態：" +
    e.features[0].properties.状態 +
    "<style>a { color:rgb(89, 235, 89); }</style>"
    )
    .addTo(map);
    map.flyTo({ 
        center: e.features[0].geometry.coordinates,
        duration: 1000,  
    });
    e.stopPropagation();
});
map.on("mouseenter", "森林環境教育専攻-フェノロジー調査2020-菌類", () => {
    map.getCanvas().style.cursor = "pointer";
});
map.on("mouseleave", "森林環境教育専攻-フェノロジー調査2020-菌類", () => {
    map.getCanvas().style.cursor = "";
});

map.on("click", "森林環境教育専攻-フェノロジー調査2020-爬虫類", (e) => {
    new mapboxgl.Popup()
    .setLngLat(e.features[0].geometry.coordinates)
    .setHTML(
    "<h3>" + 
    e.features[0].properties.種名 +
    "</h3>" +
    "<a href='http://ja.wikipedia.org/wiki/" +
    e.features[0].properties.種名 +
    "' target='_blank' rel='noopener noreferrer'>ウィキペディアで調べる</a><hr>日時：" +
    e.features[0].properties.日時 +
    "<br>場所：" +
    e.features[0].properties.場所 +
    "<br>状態：" +
    e.features[0].properties.状態 +
    "<style>a { color:rgb(89, 235, 89); }</style>"
    )
    .addTo(map);
    map.flyTo({ 
        center: e.features[0].geometry.coordinates,
        duration: 1000,  
    });
    e.stopPropagation();
});
map.on("mouseenter", "森林環境教育専攻-フェノロジー調査2020-爬虫類", () => {
    map.getCanvas().style.cursor = "pointer";
});
map.on("mouseleave", "森林環境教育専攻-フェノロジー調査2020-爬虫類", () => {
    map.getCanvas().style.cursor = "";
});

map.on("click", "森林環境教育専攻-フェノロジー調査2020-魚類", (e) => {
    new mapboxgl.Popup()
    .setLngLat(e.features[0].geometry.coordinates)
    .setHTML(
    "<h3>" + 
    e.features[0].properties.種名 +
    "</h3>" +
    "<a href='http://ja.wikipedia.org/wiki/" +
    e.features[0].properties.種名 +
    "' target='_blank' rel='noopener noreferrer'>ウィキペディアで調べる</a><hr>日時：" +
    e.features[0].properties.日時 +
    "<br>場所：" +
    e.features[0].properties.場所 +
    "<br>状態：" +
    e.features[0].properties.状態 +
    "<style>a { color:rgb(89, 235, 89); }</style>"
    )
    .addTo(map);
    map.flyTo({ 
        center: e.features[0].geometry.coordinates,
        duration: 1000,  
    });
    e.stopPropagation();
});

map.on("mouseenter", "森林環境教育専攻-フェノロジー調査2020-魚類", () => {
    map.getCanvas().style.cursor = "pointer";
});
map.on("mouseleave", "森林環境教育専攻-フェノロジー調査2020-魚類", () => {
    map.getCanvas().style.cursor = "";
});

map.on("click", "森林環境教育専攻-フェノロジー調査2020-両生類", (e) => {
    new mapboxgl.Popup()
    .setLngLat(e.features[0].geometry.coordinates)
    .setHTML(
    "<h3>" + 
    e.features[0].properties.種名 +
    "</h3>" +
    "<a href='http://ja.wikipedia.org/wiki/" +
    e.features[0].properties.種名 +
    "' target='_blank' rel='noopener noreferrer'>ウィキペディアで調べる</a><hr>日時：" +
    e.features[0].properties.日時 +
    "<br>場所：" +
    e.features[0].properties.場所 +
    "<br>状態：" +
    e.features[0].properties.状態 +
    "<style>a { color:rgb(89, 235, 89); }</style>"
    )
    .addTo(map);
    map.flyTo({ 
        center: e.features[0].geometry.coordinates,
        duration: 1000,  
    });
    e.stopPropagation();
});

map.on("mouseenter", "森林環境教育専攻-フェノロジー調査2020-両生類", () => {
    map.getCanvas().style.cursor = "pointer";
});
map.on("mouseleave", "森林環境教育専攻-フェノロジー調査2020-両生類", () => {
    map.getCanvas().style.cursor = "";
});

map.on("click", "森林環境教育専攻-フェノロジー調査2020-多足類", (e) => {
    new mapboxgl.Popup()
    .setLngLat(e.features[0].geometry.coordinates)
    .setHTML(
    "<h3>" + 
    e.features[0].properties.種名 +
    "</h3>" +
    "<a href='http://ja.wikipedia.org/wiki/" +
    e.features[0].properties.種名 +
    "' target='_blank' rel='noopener noreferrer'>ウィキペディアで調べる</a><hr>日時：" +
    e.features[0].properties.日時 +
    "<br>場所：" +
    e.features[0].properties.場所 +
    "<br>状態：" +
    e.features[0].properties.状態 +
    "<style>a { color:rgb(89, 235, 89); }</style>"
    )
    .addTo(map);
    map.flyTo({ 
        center: e.features[0].geometry.coordinates,
        duration: 1000,  
    });
    e.stopPropagation();
});

map.on("mouseenter", "森林環境教育専攻-フェノロジー調査2020-多足類", () => {
    map.getCanvas().style.cursor = "pointer";
});
map.on("mouseleave", "森林環境教育専攻-フェノロジー調査2020-多足類", () => {
    map.getCanvas().style.cursor = "";
});

map.on("click", "森林環境教育専攻-フェノロジー調査2020-地衣類", (e) => {
    new mapboxgl.Popup()
    .setLngLat(e.features[0].geometry.coordinates)
    .setHTML(
    "<h3>" + 
    e.features[0].properties.種名 +
    "</h3>" +
    "<a href='http://ja.wikipedia.org/wiki/" +
    e.features[0].properties.種名 +
    "' target='_blank' rel='noopener noreferrer'>ウィキペディアで調べる</a><hr>日時：" +
    e.features[0].properties.日時 +
    "<br>場所：" +
    e.features[0].properties.場所 +
    "<br>状態：" +
    e.features[0].properties.状態 +
    "<style>a { color:rgb(89, 235, 89); }</style>"
    )
    .addTo(map);
    map.flyTo({ 
        center: e.features[0].geometry.coordinates,
        duration: 1000,  
    });
    e.stopPropagation();
});

map.on("mouseenter", "森林環境教育専攻-フェノロジー調査2020-地衣類", () => {
    map.getCanvas().style.cursor = "pointer";
});
map.on("mouseleave", "森林環境教育専攻-フェノロジー調査2020-地衣類", () => {
    map.getCanvas().style.cursor = "";
});

map.on("click", "森林環境教育専攻-フェノロジー調査2020-コケ", (e) => {
    new mapboxgl.Popup()
    .setLngLat(e.features[0].geometry.coordinates)
    .setHTML(
    "<h3>" + 
    e.features[0].properties.種名 +
    "</h3>" +
    "<a href='http://ja.wikipedia.org/wiki/" +
    e.features[0].properties.種名 +
    "' target='_blank' rel='noopener noreferrer'>ウィキペディアで調べる</a><hr>日時：" +
    e.features[0].properties.日時 +
    "<br>場所：" +
    e.features[0].properties.場所 +
    "<br>状態：" +
    e.features[0].properties.状態 +
    "<style>a { color:rgb(89, 235, 89); }</style>"
    )
    .addTo(map);
    map.flyTo({ 
        center: e.features[0].geometry.coordinates,
        duration: 1000,  
    });
    e.stopPropagation();
});

map.on("mouseenter", "森林環境教育専攻-フェノロジー調査2020-コケ", () => {
    map.getCanvas().style.cursor = "pointer";
});
map.on("mouseleave", "森林環境教育専攻-フェノロジー調査2020-コケ", () => {
    map.getCanvas().style.cursor = "";
});

map.on("click", "森林環境教育専攻-フェノロジー調査2020-シダ植物", (e) => {
    new mapboxgl.Popup()
    .setLngLat(e.features[0].geometry.coordinates)
    .setHTML(
    "<h3>" + 
    e.features[0].properties.種名 +
    "</h3>" +
    "<a href='http://ja.wikipedia.org/wiki/" +
    e.features[0].properties.種名 +
    "' target='_blank' rel='noopener noreferrer'>ウィキペディアで調べる</a><hr>日時：" +
    e.features[0].properties.日時 +
    "<br>場所：" +
    e.features[0].properties.場所 +
    "<br>状態：" +
    e.features[0].properties.状態 +
    "<style>a { color:rgb(89, 235, 89); }</style>"
    )
    .addTo(map);
    map.flyTo({ 
        center: e.features[0].geometry.coordinates,
        duration: 1000,  
    });
    e.stopPropagation();
});

map.on("mouseenter", "森林環境教育専攻-フェノロジー調査2020-シダ植物", () => {
    map.getCanvas().style.cursor = "pointer";
});
map.on("mouseleave", "森林環境教育専攻-フェノロジー調査2020-シダ植物", () => {
    map.getCanvas().style.cursor = "";
});

map.on("click", "森林環境教育専攻-フェノロジー調査2020-虫こぶ", (e) => {
    new mapboxgl.Popup()
    .setLngLat(e.features[0].geometry.coordinates)
    .setHTML(
    "<h3>" + 
    e.features[0].properties.種名 +
    "</h3>" +
    "<a href='http://ja.wikipedia.org/wiki/" +
    e.features[0].properties.種名 +
    "' target='_blank' rel='noopener noreferrer'>ウィキペディアで調べる</a><hr>日時：" +
    e.features[0].properties.日時 +
    "<br>場所：" +
    e.features[0].properties.場所 +
    "<br>状態：" +
    e.features[0].properties.状態 +
    "<style>a { color:rgb(89, 235, 89); }</style>"
    )
    .addTo(map);
    map.flyTo({ 
        center: e.features[0].geometry.coordinates,
        duration: 1000,  
    });
    e.stopPropagation();
});

map.on("mouseenter", "森林環境教育専攻-フェノロジー調査2020-虫こぶ", () => {
    map.getCanvas().style.cursor = "pointer";
});
map.on("mouseleave", "森林環境教育専攻-フェノロジー調査2020-虫こぶ", () => {
    map.getCanvas().style.cursor = "";
});


map.on("click", "翔楓祭2021企画", (e) => {
    new mapboxgl.Popup()
    .setLngLat(e.features[0].geometry.coordinates)
    .setHTML(
    "<div id='scroll-inner'><div id='scroll-top'><h3>" +
    e.features[0].properties.name +
    e.features[0].properties.kai +
    "</h3>" +
    e.features[0].properties.項目 +
    "<hr>" +
    e.features[0].properties.説明 +
    "<a href='" +
    e.features[0].properties.写真 +
    "' target='_blank'rel='noopener noreferrer'><img src='" +
    e.features[0].properties.写真 +
    "' width='100%' height='190px'></div></div><style>img { object-fit: cover;} a { color:rgb(89, 235, 89); }</style>"
    )
    .addTo(map);
    map.flyTo({ 
        center: e.features[0].geometry.coordinates,
        duration: 1000, 
    });
    let target = document.getElementById("scroll-top");
    target.scrollIntoView(true);
    e.stopPropagation();
});
map.on("mouseenter", "翔楓祭2021企画", () => {
    map.getCanvas().style.cursor = "pointer";
});
map.on("mouseleave", "翔楓祭2021企画", () => {
    map.getCanvas().style.cursor = "";
});

map.on("click", "林業専攻-OWL利用研修立木計測データ", (e) => {
    new mapboxgl.Popup()
    .setLngLat(e.features[0].geometry.coordinates)
    .setHTML(
    "<h3>OWL-立木計測データ</h3><hr>樹種：" +
    e.features[0].properties.樹種 +
    "<br>DBH：" +
    e.features[0].properties.胸高直径cm +
    "cm<br>樹高：" +
    e.features[0].properties.樹高m +
    "m<br>材積：" +
    e.features[0].properties.材積m3 +
    "m3<br>幹週：" +
    e.features[0].properties.幹周cm +
    "cm<br>樹幹半径：" +
    e.features[0].properties.樹冠半径m +
    "m<br>矢高：" +
    e.features[0].properties.矢高cm +
    "cm"
    )
    .addTo(map);
    map.flyTo({ 
        center: e.features[0].geometry.coordinates,
        duration: 1000,  
    });
    e.stopPropagation();
});
map.on("mouseenter", "林業専攻-OWL利用研修立木計測データ", () => {
    map.getCanvas().style.cursor = "pointer";
});
map.on("mouseleave", "林業専攻-OWL利用研修立木計測データ", () => {
    map.getCanvas().style.cursor = "";
});

map.on("click", "サインポール", (e) => {
    new mapboxgl.Popup()
    .setLngLat(e.features[0].geometry.coordinates)
    .setHTML(
    "<h3>" +
    e.features[0].properties.名前 +
    "</h3><div style='text-align: center'><a href='" +
    e.features[0].properties.image +
    "' target='_blank'rel='noopener noreferrer'><img src='" +
    e.features[0].properties.image +
    "' width='100%' height='190px'></div><style>img { object-fit: cover;}</style>"
    )
    .addTo(map);
    map.flyTo({ 
        center: e.features[0].geometry.coordinates,
        duration: 1000, 
    });
    e.stopPropagation();
});
map.on("mouseenter", "サインポール", () => {
    map.getCanvas().style.cursor = "pointer";
});
map.on("mouseleave", "サインポール", () => {
    map.getCanvas().style.cursor = "";
});

map.on("click", "その他地点", (e) => {
    new mapboxgl.Popup()
    .setLngLat(e.features[0].geometry.coordinates)
    .setHTML(
    "<h3>" +
    e.features[0].properties.name +
    "</h3><div style='text-align: center'><a href='" +
    e.features[0].properties.image +
    "' target='_blank'rel='noopener noreferrer'><img src='" +
    e.features[0].properties.image +
    "' width='100%' height='190px'></div><style>img { object-fit: cover;}</style>"
    )
    .addTo(map);
    map.flyTo({ 
        center: e.features[0].geometry.coordinates,
        duration: 1000, 
    });
    e.stopPropagation();
});
map.on("mouseenter", "その他地点", () => {
    map.getCanvas().style.cursor = "pointer";
});
map.on("mouseleave", "その他地点", () => {
    map.getCanvas().style.cursor = "";
});

map.on("click", "自力建設", (e) => {
    const coordinates = e.lngLat;
    new mapboxgl.Popup()
    .setLngLat(e.lngLat)
    .setHTML(
    "<div id='scroll-inner'><div id='scroll-top'><h3>" +
    e.features[0].properties.name +
    "</h3>" +
    e.features[0].properties.年度 +
    "年度自力建設<hr>" +
    e.features[0].properties.説明 +
    "<br><div style='text-align: center'><a href='" +
    e.features[0].properties.image +
    "' target='_blank'rel='noopener noreferrer'><img src='" +
    e.features[0].properties.image +
    "' width='100%' height='190px'></div></div></div><style>img { object-fit: cover;}</style>"
    )
    .addTo(map);
    let target = document.getElementById("scroll-top");
    target.scrollIntoView(true);
    map.flyTo({ 
        center: coordinates ,
        duration: 1000,
    });
    e.stopPropagation();
});

map.on("mouseenter", "自力建設", () => {
    map.getCanvas().style.cursor = "pointer";
});
map.on("mouseleave", "自力建設", () => {
    map.getCanvas().style.cursor = "";
});

map.on("click", "アカデミー施設・その他建物", (e) => {
    const coordinates = e.lngLat;
    new mapboxgl.Popup()
    .setLngLat(e.lngLat)
    .setHTML(
    "<div id='scroll-inner'><div id='scroll-top'><h3>" +
    e.features[0].properties.name +
    "</h3><hr>" +
    e.features[0].properties.説明 +
    "<br><div style='text-align: center'><a href='" +
    e.features[0].properties.image +
    "' target='_blank'rel='noopener noreferrer'><img src='" +
    e.features[0].properties.image +
    "' width='100%' height='190px'></div></div></div><style>img { object-fit: cover;} a { color:rgb(89, 235, 89); }</style>"
    )
    .addTo(map);
    let target = document.getElementById("scroll-top");
    target.scrollIntoView(true);
    map.flyTo({ 
        center: coordinates,
        duration: 1000,
    });
    e.stopPropagation();
});
map.on("mouseenter", "アカデミー施設・その他建物", () => {
    map.getCanvas().style.cursor = "pointer";
});
map.on("mouseleave", "アカデミー施設・その他建物", () => {
    map.getCanvas().style.cursor = "";
});

map.on("click", "岐阜県森林研究所-試験地", (e) => {
    const coordinates = e.lngLat;
    new mapboxgl.Popup()
    .setLngLat(e.lngLat)
    .setHTML(
    "<h3>" +
    e.features[0].properties.活用内容 +
    "</h3><hr>活用期間：" +
    e.features[0].properties.活用期間 +
    "<br>番号：" +
    e.features[0].properties.番号
    )
    .addTo(map);
    map.flyTo({ 
        center: coordinates,
        duration: 1000, 
    });
    e.stopPropagation();
});
//カーソルをポインタに変更する//マウスは演習林-林班の上にあります。
map.on("mouseenter", "岐阜県森林研究所-試験地", () => {
    map.getCanvas().style.cursor = "pointer";
});
//カーソルをポインタに戻します 状態レイヤーを離れるとき。
map.on("mouseleave", "岐阜県森林研究所-試験地", () => {
    map.getCanvas().style.cursor = "";
});

map.on("click", "未来の森づくり予定地", (e) => {
    const coordinates = e.lngLat;
    new mapboxgl.Popup()
    .setLngLat(e.lngLat)
    .setHTML(
    "<h3>未来の森づくり予定地</h3><hr>面積：0.85ha<br><br><a href='https://www.forest.ac.jp/about/20th_anniversary/forest-future/' target='_blank' rel='noopener noreferrer'>詳細Webページ</a><style>a { color:rgb(89, 235, 89); }</style>"
    )
    .addTo(map);
    map.flyTo({
        center: coordinates,
        duration: 1000, 
    });
    e.stopPropagation();
});
map.on("mouseenter", "未来の森づくり予定地", () => {
    map.getCanvas().style.cursor = "pointer";
});
map.on("mouseleave", "未来の森づくり予定地", () => {
    map.getCanvas().style.cursor = "";
});

map.on("click", "演習林-スギ林", (e) => {
    new mapboxgl.Popup()
    .setLngLat(e.lngLat)
    .setHTML(
    "<h3>" +
    e.features[0].properties.樹種 +
    "林　" +
    e.features[0].properties.小林班ID +
    "</h3><hr>樹種：" +
    e.features[0].properties.樹種 +
    "<br>林齢：" +
    e.features[0].properties.林齢 +
    "年(R1年度)<br>面積：" +
    e.features[0].properties.面積 +
    "ha<br>林班：" +
    e.features[0].properties.林班 +
    "<br>小班：" +
    e.features[0].properties.小班 +
    "<br>通称：" +
    e.features[0].properties.通称
    )
    .addTo(map);
    e.stopPropagation();
});
map.on("mouseenter", "演習林-スギ林", () => {
    map.getCanvas().style.cursor = "pointer";
});
map.on("mouseleave", "演習林-スギ林", () => {
    map.getCanvas().style.cursor = "";
});

map.on("click", "演習林-ヒノキ林", (e) => {
    new mapboxgl.Popup()
    .setLngLat(e.lngLat)
    .setHTML(
    "<h3>" +
    e.features[0].properties.樹種 +
    "林　" +
    e.features[0].properties.小林班ID +
    "</h3><hr>樹種：" +
    e.features[0].properties.樹種 +
    "<br>林齢：" +
    e.features[0].properties.林齢 +
    "年(R1年度)<br>面積：" +
    e.features[0].properties.面積 +
    "ha<br>林班：" +
    e.features[0].properties.林班 +
    "<br>小班：" +
    e.features[0].properties.小班 +
    "<br>通称：" +
    e.features[0].properties.通称
    )
    .addTo(map);
    e.stopPropagation();
});
map.on("mouseenter", "演習林-ヒノキ林", () => {
    map.getCanvas().style.cursor = "pointer";
});
map.on("mouseleave", "演習林-ヒノキ林", () => {
    map.getCanvas().style.cursor = "";
});

map.on("click", "演習林-アカマツ林", (e) => {
    new mapboxgl.Popup()
    .setLngLat(e.lngLat)
    .setHTML(
    "<h3>" +
    e.features[0].properties.樹種 +
    "林　" +
    e.features[0].properties.小林班ID +
    "</h3><hr>樹種：" +
    e.features[0].properties.樹種 +
    "<br>林齢：" +
    e.features[0].properties.林齢 +
    "年(R1年度)<br>面積：" +
    e.features[0].properties.面積 +
    "ha<br>林班：" +
    e.features[0].properties.林班 +
    "<br>小班：" +
    e.features[0].properties.小班 +
    "<br>通称：" +
    e.features[0].properties.通称
    )
    .addTo(map);
    e.stopPropagation();
});
map.on("mouseenter", "演習林-アカマツ林", () => {
    map.getCanvas().style.cursor = "pointer";
});
map.on("mouseleave", "演習林-アカマツ林", () => {
    map.getCanvas().style.cursor = "";
});

map.on("click", "演習林-スラッシュマツ林", (e) => {
    new mapboxgl.Popup()
    .setLngLat(e.lngLat)
    .setHTML(
    "<h3>" +
    e.features[0].properties.樹種 +
    "林　" +
    e.features[0].properties.小林班ID +
    "</h3><hr>樹種：" +
    e.features[0].properties.樹種 +
    "<br>林齢：" +
    e.features[0].properties.林齢 +
    "年(R1年度)<br>面積：" +
    e.features[0].properties.面積 +
    "ha<br>林班：" +
    e.features[0].properties.林班 +
    "<br>小班：" +
    e.features[0].properties.小班 +
    "<br>通称：" +
    e.features[0].properties.通称
    )
    .addTo(map);
    e.stopPropagation();
});
map.on("mouseenter", "演習林-スラッシュマツ林", () => {
    map.getCanvas().style.cursor = "pointer";
});
map.on("mouseleave", "演習林-スラッシュマツ林", () => {
    map.getCanvas().style.cursor = "";
});

map.on("click", "演習林-広葉樹林", (e) => {
    new mapboxgl.Popup()
    .setLngLat(e.lngLat)
    .setHTML(
    "<h3>" +
    e.features[0].properties.樹種 +
    "林　" +
    e.features[0].properties.小林班ID +
    "</h2><hr>樹種：" +
    e.features[0].properties.樹種 +
    "<br>面積：" +
    e.features[0].properties.面積 +
    "ha<br>林班：" +
    e.features[0].properties.林班 +
    "<br>小班：" +
    e.features[0].properties.小班 +
    "<br>通称：" +
    e.features[0].properties.通称
    )
    .addTo(map);
    e.stopPropagation();
});
map.on("mouseenter", "演習林-広葉樹林", () => {
    map.getCanvas().style.cursor = "pointer";
});
map.on("mouseleave", "演習林-広葉樹林", () => {
    map.getCanvas().style.cursor = "";
});

map.on("click", "演習林-草地", (e) => {
    new mapboxgl.Popup()
    .setLngLat(e.lngLat)
    .setHTML(
    "<h3>" +
    e.features[0].properties.樹種 +
    "　" +
    e.features[0].properties.小林班ID +
    "</h3><hr>樹種：" +
    e.features[0].properties.樹種 +
    "<br>面積：" +
    e.features[0].properties.面積 +
    "ha<br>林班：" +
    e.features[0].properties.林班 +
    "<br>小班：" +
    e.features[0].properties.小班 +
    "<br>通称：" +
    e.features[0].properties.通称
    )
    .addTo(map);
    e.stopPropagation();
});
map.on("mouseenter", "演習林-草地", () => {
    map.getCanvas().style.cursor = "pointer";
});
map.on("mouseleave", "演習林-草地", () => {
    map.getCanvas().style.cursor = "";
});

map.on("click", "演習林-その他岩石", (e) => {
    new mapboxgl.Popup()
    .setLngLat(e.lngLat)
    .setHTML(
    "<h3>" +
    e.features[0].properties.樹種 +
    "　" +
    e.features[0].properties.小林班ID +
    "</h3><hr>樹種：" +
    e.features[0].properties.樹種 +
    "<br>面積：" +
    e.features[0].properties.面積 +
    "ha<br>林班：" +
    e.features[0].properties.林班 +
    "<br>小班：" +
    e.features[0].properties.小班 +
    "<br>通称：" +
    e.features[0].properties.通称
    )
    .addTo(map);
    e.stopPropagation();
});
map.on("mouseenter", "演習林-その他岩石", () => {
    map.getCanvas().style.cursor = "pointer";
});
map.on("mouseleave", "演習林-その他岩石", () => {
    map.getCanvas().style.cursor = "";
});

map.on("click", "古城山国有林-林分", (e) => {
    new mapboxgl.Popup()
    .setLngLat(e.lngLat)
    .setHTML(
    "<h3>" +
    e.features[0].properties.国有林_樹種１ +
    "林(" +
    e.features[0].properties.国有林_名前 +
    ")</h3><hr>樹種：" +
    e.features[0].properties.国有林_樹種１ +
    "<br>林齢：" +
    e.features[0].properties.国有林_最新林齢１ +
    "年(H30年度)<br>面積：" +
    e.features[0].properties.国有林_面積 +
    "ha<br>材積：" +
    e.features[0].properties.国有林_材積 +
    "m3<br>林種の細分：" +
    e.features[0].properties.国有林_林種の細分 +
    "<br>保安林：" +
    e.features[0].properties.国有林_保安林１ +
    "<br>機能類型：" +
    e.features[0].properties.国有林_機能類型
    )
    .addTo(map);
    e.stopPropagation();
});
map.on("mouseenter", "古城山国有林-林分", () => {
    map.getCanvas().style.cursor = "pointer";
});
map.on("mouseleave", "古城山国有林-林分", () => {
    map.getCanvas().style.cursor = "";
});