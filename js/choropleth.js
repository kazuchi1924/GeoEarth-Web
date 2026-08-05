// コロプレス図の切り替え
document.getElementById('choropleth-select').addEventListener('change', (e) => {
    applyChoropleth(e.target.value);
});

function applyChoropleth(attribute) {
    if (attribute === 'none') {
        map.setPaintProperty('my-countries-fill', 'fill-color', '#627BC1');
        return;
    }

    let expression;
    if (attribute === 'POP_EST') {
        expression = [
            'interpolate', ['linear'], ['get', 'POP_EST'],
            0, '#eaf3de',
            10000000, '#97c459',
            100000000, '#3b6d11',
            1400000000, '#173404'
        ];
    } else if (attribute === 'GDP_MD') {
        expression = [
            'interpolate', ['linear'], ['get', 'GDP_MD'],
            0, '#e6f1fb',
            100000, '#85b7eb',
            2000000, '#185fa5',
            25000000, '#042c53'
        ];
    } else if (attribute === 'INCOME_GRP') {
        expression = [
            'match', ['get', 'INCOME_GRP'],
            'High income', '#3b6d11',
            'Upper middle income', '#97c459',
            'Lower middle income', '#fac775',
            'Low income', '#e24b4a',
            '#888780' // どれにも該当しない場合
        ];
    }

    map.setPaintProperty('my-countries-fill', 'fill-color', expression);
}