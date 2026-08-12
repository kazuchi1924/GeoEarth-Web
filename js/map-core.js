const map = new maplibregl.Map({
    container: "map",
    // 動作確認用にMapLibre公式のデモスタイルを使用
    // 本番では自前でホストするスタイル/タイルに差し替える想定
    //style: 'https://demotiles.maplibre.org/style.json',
    style: "https://tiles.openfreemap.org/styles/liberty",
    zoom: 1.5,
    center: [137.9, 36.3], // 日本を中心に
    projection: { type: "globe" }, // ← これがglobe表示の肝
});

// ============================================
// [Windows/Android専用] Dart側から evaluateJavascript 経由で
// window.loadCountriesData()が呼ばれる
// Web版はこの関数自体は定義されるが、呼び出されない
// ============================================
let pendingCountriesData = null;
window.loadCountriesData = function (geojsonObj) {
    const source = map.getSource("my-countries");
    if (source) {
        source.setData(geojsonObj);
    } else {
        pendingCountriesData = geojsonObj;
    }
};

// ============================================
// [Windows/Android専用] Dart側から evaluateJavascript 経由で
// window.loadCapitalsData()が呼ばれる
// Web版はこの関数自体は定義されるが、呼び出されない
// ============================================
let pendingCapitalsData = null;
let capitalsLookup = {}; // ADM0_A3 → 首都名 の対応表
window.loadCapitalsData = function (geojsonObj) {
    // ポップアップ用ルックアップの構築(既存のまま)
    geojsonObj.features.forEach((f) => {
        capitalsLookup[f.properties.ADM0_A3] = f.properties.NAME_JA;
    });

    // 地図の点レイヤー用ソースにも反映
    const source = map.getSource("capitals");
    if (source) {
        source.setData(geojsonObj);
    } else {
        pendingCapitalsData = geojsonObj;
    }
};

// ============================================
// [Windows/Android専用] Dart側から evaluateJavascript 経由で
// window.loadHeritageData()が呼ばれる
// Web版はこの関数自体は定義されるが、呼び出されない
// ============================================
let pendingHeritageData = null;
window.loadHeritageData = function (geojsonObj) {
    const source = map.getSource("world-heritage");
    if (source) {
        source.setData(geojsonObj);
    } else {
        pendingHeritageData = geojsonObj;
    }
};

// ============================================
// [Web版専用] fetchでcapitalsを取得
// Windows/Androidはfetchが失敗するため、このブロックは無視される
// Web版はfetchが成功するので、ここでcapitals.geojsonを取得してルックアップを構築
// ============================================
fetch("capitals.geojson")
    .then((res) => res.json())
    .then((data) => {
        data.features.forEach((f) => {
            capitalsLookup[f.properties.ADM0_A3] = f.properties.NAME_JA;
        });
        const source = map.getSource("capitals");
        if (source) source.setData(data);
    })
    .catch((err) =>
        console.log("[capitals fetch] 失敗(Win/Androidでは想定内):", err),
    );

map.on("style.load", () => {
    map.setProjection({ type: "globe" });
});

// 四角いアイコンをその場で生成してMapLibreに登録
const squareCanvas = document.createElement("canvas");
squareCanvas.width = 10;
squareCanvas.height = 10;
const ctx = squareCanvas.getContext("2d");
ctx.fillStyle = "#3282F6"; // 塗りつぶし色(金色、お好みで変更可)
ctx.strokeStyle = "#333333"; // 枠線色
ctx.lineWidth = 2;
ctx.fillRect(2, 2, 6, 6);
ctx.strokeRect(2, 2, 6, 6);

map.addImage("capital-square", ctx.getImageData(0, 0, 10, 10));

map.on("load", () => {
    map.addSource("my-countries", {
        type: "geojson",
        data: "countries.geojson", // Web版はこれがそのままfetchされて成功する
        //data: { type: 'FeatureCollection', features: [] },
        promoteId: "ADM0_A3", // 国コードをfeature.idにする(クリック時のfeature.idで判定しやすくなる)
    });

    map.addLayer({
        id: "my-countries-fill",
        type: "fill",
        source: "my-countries",
        paint: {
            'fill-color': '#627BC1', // 色分けなしの初期色
            'fill-opacity': 0.0
        },
        // paint: {
        //     // POP_EST（人口）の値に応じてステップ分けで色を変える
        //     "fill-color": [
        //         "step",
        //         ["get", "POP_EST"],
        //         "#f7fcf5", // デフォルト（100万人未満など）
        //         1000000,
        //         "#e5f5e0", // 100万人以上
        //         10000000,
        //         "#a1d99b", // 1,000万人以上
        //         50000000,
        //         "#41ab5d", // 5,000万人以上
        //         100000000,
        //         "#238b45", // 1億人以上
        //         500000000,
        //         "#005a32", // 5億人以上（インドや中国など）
        //     ],
        //     "fill-opacity": 0.6, // うっすら透けさせておくと背景や他のレイヤーも見やすいよ
        // },
        // paint: {
        //       'fill-color': [
        //           'case',
        //           ['boolean', ['feature-state', 'quizCorrect'], false], '#4caf50',
        //           ['boolean', ['feature-state', 'quizWrong'], false], '#f44336',
        //           '#627BC1' // 通常時
        //       ],
        //       'fill-opacity': 0.5            }

    });

    map.addLayer({
        id: "my-countries-border",
        type: "line",
        source: "my-countries",
        paint: {
            "line-color": "#ffffff",
            "line-width": 0,
        },
    });

    if (pendingCountriesData) {
        map.getSource("my-countries").setData(pendingCountriesData);
        pendingCountriesData = null;
    }

    map.addSource("capitals", {
        type: "geojson",
        data: "capitals.geojson", // Web版はこれがそのままfetchされて成功する
    });

    map.addLayer({
        id: "capitals-point",
        type: "symbol",
        source: "capitals",
        layout: {
            "icon-image": "capital-square",
            "icon-size": 1,
            "icon-allow-overlap": true, // ズームアウト時に重なっても全部表示する
        },
    });
    // ラベル(首都名)も表示したい場合
    map.addLayer({
        id: "capitals-label",
        type: "symbol",
        source: "capitals",
        layout: {
            "text-field": ["get", "NAME_JA"],
            "text-size": 10,
            "text-offset": [0, 1.2],
            "text-anchor": "top",
        },
        paint: {
            "text-color": "#ffffff",
            "text-halo-color": "#000000",
            "text-halo-width": 1,
        },
    });
    if (pendingCapitalsData) {
        map.getSource("capitals").setData(pendingCapitalsData);
        pendingCapitalsData = null;
    }

    // 地震データのソース(https経由なので通常のfetchでOK、全プラットフォーム共通)
    map.addSource("earthquakes", {
        type: "geojson",
        //data: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_week.geojson'
        data: "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson",
    });

    map.addLayer({
        id: "earthquakes-point",
        type: "circle",
        source: "earthquakes",
        layout: {
            visibility: 'none', // 初期状態では非表示
        },
        paint: {
            // マグニチュードに応じて円の大きさを変える
            "circle-radius": [
                "interpolate",
                ["linear"],
                ["get", "mag"],
                0,
                3,
                5,
                10,
                8,
                25,
            ],
            // マグニチュードに応じて色も変える(黄→オレンジ→赤)
            "circle-color": [
                "interpolate",
                ["linear"],
                ["get", "mag"],
                0,
                "#ffeb3b",
                5,
                "#ff9800",
                7,
                "#f44336",
            ],
            "circle-opacity": 0.7,
            "circle-stroke-width": 1,
            "circle-stroke-color": "#000000",
        },
    });

    // 1. 世界遺産データのソース追加（ファイル同梱またはURL）
    map.addSource("world-heritage", {
        type: "geojson",
        data: "world-heritage.geojson", // または直接取得できるGeoJSONのURL
        //data: 'https://raw.githubusercontent.com/datasets/world-heritage-provisional-list/master/data/whc-sites-2019.geojson'
    });

    // 2. レイヤーの追加（例：分類で色分けするシンプルなCircleレイヤー）
    map.addLayer({
        id: "world-heritage-point",
        type: "circle",
        source: "world-heritage",
        layout: {
            visibility: 'none', // 初期状態では非表示
        },
        paint: {
            "circle-radius": 5,
            // 文化遺産(Cultural)と自然遺産(Natural)で色分けしてみる
            "circle-color": [
                "match",
                ["get", "category"], // GeoJSON内のプロパティ名に合わせる
                "Cultural",
                "#ff9800", // 文化遺産：オレンジ
                "Natural",
                "#8bc34a", // 自然遺産：黄緑
                "#9c27b0", // 複合遺産その他：紫
            ],
            "circle-stroke-width": 1,
            "circle-stroke-color": "#ffffff",
        },
    });

    if (pendingCapitalsData) {
        map.getSource("capitals").setData(pendingCapitalsData);
        pendingCapitalsData = null;
    }

    map.addControl(new maplibregl.NavigationControl(), 'bottom-right');
});

function getFlagEmoji(isoA2) {
    if (!isoA2 || isoA2.length !== 2) return "";
    const codePoints = isoA2
        .toUpperCase()
        .split("")
        .map((c) => 127397 + c.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
}
function getFlagImgTag(isoA2) {
    if (!isoA2) return "";
    const code = isoA2.toLowerCase();
    return `<img src="https://flagcdn.com/w40/${code}.png" alt="flag" class="flag-img">`;
}
function getFlagImgTagLocal(isoA2) {
    if (!isoA2) return "";
    const code = isoA2.toLowerCase();
    return `<img src="flags/${code}.svg" alt="flag" class="flag-img">`;
}

function getIncomeClass(incomeGrp) {
    if (incomeGrp.includes("High income")) return "income-high";
    if (incomeGrp.includes("Upper middle")) return "income-upper-mid";
    if (incomeGrp.includes("Lower middle")) return "income-lower-mid";
    return "income-low";
}

map.on('click', (e) => {

    const lngLat = map.unproject(e.point);
    const reprojected = map.project(lngLat);

    const dx = reprojected.x - e.point.x;
    const dy = reprojected.y - e.point.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 2) {
        // クランプが発生 = 地球儀の外(宇宙)をクリックした
        return; // 何もしない
    }


    // クイズモード中は国だけを対象にする(他のレイヤーが上に乗ってても無視)
    if (quizMode) {
        const countryFeatures = map.queryRenderedFeatures(e.point, { layers: ['my-countries-fill'] });
        if (countryFeatures.length > 0) {
            handleQuizAnswer(countryFeatures[0]);
        }
        return;
    }

    // 通常モード: 優先度順(上から)でレイヤーを指定
    const targetLayers = ['capitals-point', 'earthquakes-point', 'world-heritage-point', 'my-countries-fill'];
    const features = map.queryRenderedFeatures(e.point, { layers: targetLayers });

    if (features.length === 0) return; // 何もない場所をクリックした場合

    // features[0] が「一番上に描画されてる地物」
    const feature = features[0];

    switch (feature.layer.id) {
        case 'capitals-point':
            showCapitalPopup(feature, e.lngLat);
            break;
        case 'earthquakes-point':
            showEarthquakePopup(feature, e.lngLat);
            break;
        case 'world-heritage-point':
            showHeritagePopup(feature, e.lngLat);
            break;
        case 'my-countries-fill':
            showCountryPopup(feature, e.lngLat);
            break;
    }
});

function showCountryPopup(feature, lngLat) {
    const p = feature.properties;

    if (quizMode) {
        const isCorrect = p.ADM0_A3 === currentAnswerId;
        if (isCorrect) quizScore++;
        showFeedback(isCorrect, quizCountries[quizIndex].properties.NAME_JA);

        // 正誤に関わらずハイライト(正解を緑、間違えた場所を赤)
        highlightAnswer(p.ADM0_A3, currentAnswerId, isCorrect);

        quizIndex++;
        setTimeout(showNextQuestion, 1300);
        return; // クイズ中は通常のポップアップを出さない
    }

    const popEst = Number(p.POP_EST).toLocaleString('ja-JP');
    const gdpMd = Number(p.GDP_MD).toLocaleString('ja-JP');
    const capitalName = capitalsLookup[p.ADM0_A3] || 'no data';
    let incomeClass = getIncomeClass(p.INCOME_GRP);

    new maplibregl.Popup()
        .setLngLat(lngLat)
        .setHTML(`
            <div class="country-popup">
                <div class="popup-header">
                    <span class="flag">${getFlagImgTag(p.ISO_A2)}${getFlagEmoji(p.ISO_A2)}${getFlagImgTagLocal(p.ISO_A2)}</span>
                    <div>
                        <div class="name-ja">${p.NAME_JA}</div>
                        <div class="name-en">${p.NAME}</div>
                    </div>
                </div>
                <table class="popup-table">
                    <tr><td>大陸</td><td>${p.CONTINENT}</td></tr>
                    <tr><td>地域</td><td>${p.SUBREGION}</td></tr>
                    <tr><td>首都</td><td>${capitalName}</td></tr>
                    <tr><td>人口</td><td>${popEst}人 <span class="year">(${p.POP_YEAR})</span></td></tr>
                    <tr><td>GDP</td><td>${gdpMd}百万ドル <span class="year">(${p.GDP_YEAR})</span></td></tr>
                    <tr><td>所得区分</td><td><span class="badge ${incomeClass}">${p.INCOME_GRP}</span></td></tr>
                </table>
            </div>
        `)
        .addTo(map);
}

function showCapitalPopup(feature, lngLat) {
    const p = feature.properties;
    const popMax = Number(p.POP_MAX).toLocaleString("ja-JP");
    const popMin = Number(p.POP_MIN).toLocaleString("ja-JP");

    new maplibregl.Popup()
        .setLngLat(lngLat)
        .setHTML(
            `
            <div class="country-popup">
                <div class="popup-header">
                    <div>
                        <div class="name-ja">${p.NAME_JA}</div>
                        <div class="name-en">${p.NAME}</div>
                    </div>
                </div>
                <table class="popup-table">
                    <tr><td>人口最大</td><td>${popMax}人</td></tr>
                    <tr><td>人口最小</td><td>${popMin}人</td></tr>
                </table>
            </div>
            `
        )
        .addTo(map);
}

function showEarthquakePopup(feature, lngLat) {
    const p = feature.properties;
    const date = new Date(p.time).toLocaleString('ja-JP');
    new maplibregl.Popup()
        .setLngLat(lngLat)
        .setHTML(
            `
            <div class="country-popup">
                <div class="popup-header">
                    <div>
                        <div class="name-ja">地震</div>
                    </div>
                </div>
                <table class="popup-table">
                    <tr><td>マグニチュード</td><td><strong>M${p.mag}</strong></td></tr>
                    <tr><td>発生場所</td><td>${p.place}</td></tr>
                    <tr><td>発生時刻</td><td>${date}</td></tr>
                </table>
            </div>
            `
        )
        .addTo(map);
}

function showHeritagePopup(feature, lngLat) {
    const p = feature.properties;
    // 実装済みの内容に合わせて調整
    new maplibregl.Popup()
        .setLngLat(lngLat)
        .setHTML(
            `
            <div class="country-popup">
                <div class="popup-header">
                    <div>
                        <strong><div class="name-ja">🏛️${p.name_ja}</div></strong>
                        <div class="name-en">${p.name_en}</div>
                    </div>
                </div>
                <table class="popup-table">
                    <tr><td>分類</td><td><strong>${p.category || "世界遺産"}</strong></td></tr>
                    <tr><td>登録年</td><td>${p.date_inscribed + "年" || "不明"}</td></tr>
                </table>
            </div>
            `
        )
        .addTo(map);
}

function handleQuizAnswer(feature) {
    const p = feature.properties;
    const isCorrect = p.ADM0_A3 === currentAnswerId;
    if (isCorrect) quizScore++;
    showFeedback(isCorrect, quizCountries[quizIndex].properties.NAME_JA);
    highlightAnswer(p.ADM0_A3, currentAnswerId, isCorrect);
    quizIndex++;
    setTimeout(showNextQuestion, 1300);
}

// // クリックイベントは「load」の外、1回だけ登録すればOK
// // (レイヤーがまだ無くても、実際にクリックされた時にレイヤーが存在すれば動く)
// map.on("click", "my-countries-fill", (e) => {
//     const p = e.features[0].properties;

//     if (quizMode) {
//         const isCorrect = p.ADM0_A3 === currentAnswerId;
//         if (isCorrect) quizScore++;
//         showFeedback(isCorrect, quizCountries[quizIndex].properties.NAME_JA);

//         // 正誤に関わらずハイライト(正解を緑、間違えた場所を赤)
//         highlightAnswer(p.ADM0_A3, currentAnswerId, isCorrect);

//         quizIndex++;
//         setTimeout(showNextQuestion, 1300);
//         return; // クイズ中は通常のポップアップを出さない
//     }

//     // ↓ クイズモードでない時は今まで通りポップアップ表示
//     // (既存のポップアップ処理はここに残す)
//     const popEst = Number(p.POP_EST).toLocaleString("ja-JP");
//     const gdpMd = Number(p.GDP_MD).toLocaleString("ja-JP");
//     let incomeClass = getIncomeClass(p.INCOME_GRP);
//     const capitalName = capitalsLookup[p.ADM0_A3] || "no data";

//     new maplibregl.Popup()
//         .setLngLat(e.lngLat)
//         .setHTML(
//             `
//         <div class="country-popup">
//             <div class="popup-header">
//                 <span class="flag">${getFlagImgTag(p.ISO_A2)}${getFlagEmoji(p.ISO_A2)}${getFlagImgTagLocal(p.ISO_A2)}</span>
//                 <div>
//                     <div class="name-ja">${p.NAME_JA}</div>
//                     <div class="name-en">${p.NAME}</div>
//                 </div>
//             </div>
//             <table class="popup-table">
//                 <tr><td>大陸</td><td>${p.CONTINENT}</td></tr>
//                 <tr><td>地域</td><td>${p.SUBREGION}</td></tr>
//                 <tr><td>首都</td><td>${capitalName}</td></tr>
//                 <tr><td>人口</td><td>${popEst}人 <span class="year">(${p.POP_YEAR})</span></td></tr>
//                 <tr><td>GDP</td><td>${gdpMd}百万ドル <span class="year">(${p.GDP_YEAR})</span></td></tr>
//                 <tr><td>所得区分</td><td><span class="badge ${incomeClass}">${p.INCOME_GRP}</span></td></tr>
//             </table>
//         </div>
//     `,
//         )
//         .addTo(map);
// });

map.on("mouseenter", "my-countries-fill", () => {
    map.getCanvas().style.cursor = "pointer";
});
map.on("mouseleave", "my-countries-fill", () => {
    map.getCanvas().style.cursor = "";
});

// map.on("click", "capitals-point", (e) => {
//     const p = e.features[0].properties;
//     console.log("capitals-point clicked: %o", p);
//     const popMax = Number(p.POP_MAX).toLocaleString("ja-JP");
//     const popMin = Number(p.POP_MIN).toLocaleString("ja-JP");

//     new maplibregl.Popup()
//         .setLngLat(e.lngLat)
//         .setHTML(
//             `
//         <div class="country-popup">
//             <div class="popup-header">
//                 <div>
//                     <div class="name-ja">${p.NAME_JA}</div>
//                     <div class="name-en">${p.NAME}</div>
//                 </div>
//             </div>
//             <table class="popup-table">
//                 <tr><td>人口最大</td><td>${popMax}人</td></tr>
//                 <tr><td>人口最小</td><td>${popMin}人</td></tr>
//             </table>
//         </div>
//     `,
//         )
//         .addTo(map);
// });

map.on("mouseenter", "capitals-point", () => {
    map.getCanvas().style.cursor = "pointer";
});
map.on("mouseleave", "capitals-point", () => {
    map.getCanvas().style.cursor = "";
});

// map.on("click", "earthquakes-point", (e) => {
//     const p = e.features[0].properties;
//     const date = new Date(p.time).toLocaleString("ja-JP");

//     new maplibregl.Popup()
//         .setLngLat(e.lngLat)
//         .setHTML(
//             `
//         <div class="country-popup">
//             <div class="popup-header">
//                 <div>
//                     <div class="name-ja">地震</div>
//                 </div>
//             </div>
//             <table class="popup-table">
//                 <tr><td>マグニチュード</td><td><strong>M${p.mag}</strong></td></tr>
//                 <tr><td>発生場所</td><td>${p.place}</td></tr>
//                 <tr><td>発生時刻</td><td>${date}</td></tr>
//             </table>
//         </div>
//     `,
//         )
//         .addTo(map);
// });

map.on("mouseenter", "earthquakes-point", () => {
    map.getCanvas().style.cursor = "pointer";
});
map.on("mouseleave", "earthquakes-point", () => {
    map.getCanvas().style.cursor = "";
});

// // 3. クリック時のポップアップ表示
// map.on("click", "world-heritage-point", (e) => {
//     const p = e.features[0].properties;

//     new maplibregl.Popup()
//         .setLngLat(e.lngLat)
//         .setHTML(
//             `
//         <div class="country-popup">
//             <div class="popup-header">
//                 <div>
//                     <strong><div class="name-ja">🏛️${p.name_ja}</div></strong>
//                     <div class="name-en">${p.name_en}</div>
//                 </div>
//             </div>
//             <table class="popup-table">
//                 <tr><td>分類</td><td><strong>${p.category || "世界遺産"}</strong></td></tr>
//                 <tr><td>登録年</td><td>${p.date_inscribed + "年" || "不明"}</td></tr>
//             </table>
//         </div>

//     `,
//         )
//         .addTo(map);
// });

// カーソル変更
map.on(
    "mouseenter",
    "world-heritage-point",
    () => (map.getCanvas().style.cursor = "pointer"),
);
map.on(
    "mouseleave",
    "world-heritage-point",
    () => (map.getCanvas().style.cursor = ""),
);

// 定期的に最新データへ更新したい場合(任意)
setInterval(
    () => {
        map.getSource("earthquakes").setData(
            //'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_week.geojson'
            "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson",
        );
    },
    5 * 60 * 1000,
); // 5分おき

// C#側からのメッセージを受け取る例（HybridWebView連携時に使用）
// window.chrome.webview は Windows(WebView2)固有。
// MAUI HybridWebViewの場合は下記のようなグローバル関数越しにC#→JSを呼べる
// window.receiveFromDotNet = (msg) => { console.log('from .NET:', msg); };

// Dart側から呼び出す関数(グローバルに公開)
// window.loadCountriesData = function (geojsonObj) {
//     const source = map.getSource('my-countries');
//     if (source) {
//         source.setData(geojsonObj);
//     }
// };
window.loadCountriesData = function (geojsonObj) {
    console.log(
        "[loadCountriesData] called, features count =",
        geojsonObj && geojsonObj.features
            ? geojsonObj.features.length
            : "N/A",
    );

    const source = map.getSource("my-countries");
    if (source) {
        source.setData(geojsonObj);
        console.log("[loadCountriesData] setData 完了");
    } else {
        pendingCountriesData = geojsonObj;
        console.log("[loadCountriesData] ソース未作成、pendingに保存");
    }
};

// JS側の未捕捉エラーもコンソールに出す(onConsoleMessageで拾えるように)
window.onerror = function (message, source, lineno, colno, error) {
    console.log("[window.onerror]", message, "at", source, lineno, colno);
};