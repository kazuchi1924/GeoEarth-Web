document.getElementById('layer-panel-toggle').addEventListener('click', () => {
    const panel = document.getElementById('layer-panel');
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
});

// レイヤーの表示/非表示切り替え(汎用関数)
function bindLayerToggle(checkboxId, layerIds) {
    document.getElementById(checkboxId).addEventListener('change', (e) => {
        const visibility = e.target.checked ? 'visible' : 'none';
        layerIds.forEach(id => map.setLayoutProperty(id, 'visibility', visibility));
    });
}

bindLayerToggle('toggle-capitals', ['capitals-point', 'capitals-label']);
bindLayerToggle('toggle-earthquakes', ['earthquakes-point']);
bindLayerToggle('toggle-heritage', ['world-heritage-point']); // 世界遺産レイヤーのID(実装済みのものに合わせて)