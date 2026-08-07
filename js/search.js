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
    // 同じ国名を持つ断片を全部集める(1件とは限らない)
    const matchingFeatures = allCountryFeatures.filter(f => f.properties.NAME_JA === name);
    if (matchingFeatures.length === 0) return;

    flyToCountry(matchingFeatures);
});

function flyToCountry(features) {
    const bounds = new maplibregl.LngLatBounds();
    let refLng = null;

    features.forEach((f) => {
        const fb = getFeatureBounds(f);
        let ne = fb.getNorthEast();
        let sw = fb.getSouthWest();
        let centerLng = (ne.lng + sw.lng) / 2;

        if (refLng === null) {
            refLng = centerLng;
        } else {
            while (centerLng - refLng > 180) {
                ne.lng -= 360; sw.lng -= 360; centerLng -= 360;
            }
            while (refLng - centerLng > 180) {
                ne.lng += 360; sw.lng += 360; centerLng += 360;
            }
        }

        bounds.extend(ne);
        bounds.extend(sw);
    });

    map.fitBounds(bounds, { padding: 60, duration: 1500 });

    // 一番面積が大きい断片を選ぶ(小島にポップアップが乗るのを防ぐ)
    let largestFeature = features[0];
    let largestArea = 0;
    features.forEach((f) => {
        const area = turf.area(f);
        if (area > largestArea) {
            largestArea = area;
            largestFeature = f;
        }
    });

    const onLandPoint = turf.pointOnFeature(largestFeature);
    const popupLngLat = onLandPoint.geometry.coordinates;

    setTimeout(() => {
        showCountryPopup(largestFeature, popupLngLat);
        highlightSearchResult(largestFeature.properties.ADM0_A3);
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