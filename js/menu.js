document.getElementById('main-menu-toggle').addEventListener('click', () => {
    const menu = document.getElementById('main-menu');
    menu.style.display = menu.style.display === 'none' ? 'flex' : 'none';
});

document.getElementById('menu-quiz-btn').addEventListener('click', () => {
    document.getElementById('main-menu').style.display = 'none';
    document.getElementById('main-menu-toggle').style.display = 'none';
    startQuiz(); 
});

document.getElementById('menu-search-btn').addEventListener('click', () => {
    document.getElementById('main-menu').style.display = 'none';
    document.getElementById('main-menu-toggle').style.display = 'none';
    openSearch(); 
});
