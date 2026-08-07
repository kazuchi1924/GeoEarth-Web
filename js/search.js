let allCountryFeatures = [];


function openSearch() {
    allCountryFeatures = map.querySourceFeatures('my-countries')
        .filter(f => f.properties.NAME_JA);

    const datalist = document.getElementById('country-list');
    datalist.innerHTML = '';
    allCountryFeatures.forEach(f => {
        const option = document.createElement('option');
        option.value = f.properties.NAME_JA;
        datalist.appendChild(option);
    });

    document.getElementById('search-bar').style.display = 'flex';
    document.getElementById('search-input').focus();

    document.getElementById('layer-panel-toggle').style.display = 'none';
    document.getElementById('layer-panel').style.display = 'none'; // 開いてたら閉じる

}

document.getElementById('search-close-btn').addEventListener('click', closeSearch);

function closeSearch() {
    document.getElementById('search-bar').style.display = 'none';
    //document.getElementById('search-toggle-btn').style.display = 'block';
    document.getElementById('search-input').value = '';
    document.getElementById('main-menu-toggle').style.display = 'block';
    document.getElementById('layer-panel-toggle').style.display = 'block';

}

document.getElementById('search-input').addEventListener('change', (e) => {
    const name = e.target.value;
    const feature = allCountryFeatures.find(f => f.properties.NAME_JA === name);
    if (!feature) return;

    flyToCountry(feature);
});

function flyToCountry(feature) {
    const bounds = getFeatureBounds(feature);
    map.fitBounds(bounds, { padding: 60, duration: 1500 });

    // 少し引きの状態が落ち着いてから、ポップアップとハイライトを出す
    setTimeout(() => {
        showCountryPopup(feature, bounds.getCenter());
        highlightSearchResult(feature.properties.ADM0_A3);
    }, 1600);
}

// ポリゴンの座標を全部たどって外接矩形(bounding box)を計算
function getFeatureBounds(feature) {
    const bounds = new maplibregl.LngLatBounds();

    function processCoords(coords) {
        if (typeof coords[0] === 'number') {
            bounds.extend(coords); // [lng, lat] の末端に到達
        } else {
            coords.forEach(processCoords);
        }
    }

    processCoords(feature.geometry.coordinates);
    return bounds;
}

function highlightSearchResult(adm0a3) {
    map.setFeatureState({ source: 'my-countries', id: adm0a3 }, { quizCorrect: true });
    setTimeout(() => {
        map.setFeatureState({ source: 'my-countries', id: adm0a3 }, { quizCorrect: false });
    }, 2000);
}