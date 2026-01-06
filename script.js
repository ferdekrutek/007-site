// Dane startowe pobierane z pamięci przeglądarki
let articles = JSON.parse(localStorage.getItem('k007_articles')) || [];
let polls = JSON.parse(localStorage.getItem('k007_polls')) || [];
let allowedIDs = JSON.parse(localStorage.getItem('k007_allowed_ids')) || ["DZIENNIKARZ007"];
let journalistPasses = JSON.parse(localStorage.getItem('k007_j_passes')) || {};

// Inicjalizacja przy ładowaniu strony
document.addEventListener('DOMContentLoaded', () => {
    const savedAbout = localStorage.getItem('k007_about_text');
    if(savedAbout) {
        const aboutBox = document.querySelector('.about-us-box p');
        if(aboutBox) aboutBox.innerText = savedAbout;
        const editArea = document.getElementById('edit-about-text');
        if(editArea) editArea.value = savedAbout;
    }
    
    // Podgląd nazwy pliku w edytorze
    const fileInput = document.getElementById('art-file');
    if(fileInput) {
        fileInput.addEventListener('change', function() {
            const fileName = this.files[0] ? this.files[0].name : "Nie wybrano pliku";
            document.getElementById('file-name-display').innerText = "Wybrano: " + fileName;
        });
    }
});

// Zarządzanie widocznością stron
function showPage(id) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const target = document.getElementById(id);
    if(target) target.classList.add('active');
    window.scrollTo(0,0);
    
    if(id === 'articles-page') renderArticles();
    if(id === 'polls-page') renderPolls();
    if(id === 'admin-dashboard') renderAdminTools();
}

// Obsługa Bramki i Logowania
function openGate() { document.getElementById('gate-modal').style.display = 'flex'; }
function closeGate() { document.getElementById('gate-modal').style.display = 'none'; }

function showAuth(type) {
    closeGate();
    showPage(type + '-login-page');
}

function verifyAdmin() {
    const l = document.getElementById('admin-login-input').value;
    const p = document.getElementById('admin-password-input').value;
    if(l === "Admin7!" && p === "Panel007!") showPage('admin-dashboard');
    else alert("Odmowa dostępu!");
}

function loginJournalist() {
    const id = document.getElementById('j-id-input').value.toUpperCase().trim();
    const pass = document.getElementById('j-pass-input').value;
    if(!allowedIDs.includes(id)) return alert("Nieprawidłowe ID.");
    if(!journalistPasses[id]) journalistPasses[id] = pass;
    
    if(journalistPasses[id] === pass) {
        showPage('editor-page');
        localStorage.setItem('k007_j_passes', JSON.stringify(journalistPasses));
    } else alert("Błędne hasło.");
}

// Zarządzanie Artykułami
function publishArticle() {
    const title = document.getElementById('art-title').value;
    const content = document.getElementById('art-content').value;
    const author = document.getElementById('art-author').value;
    const file = document.getElementById('art-file').files[0];

    if(!title || !file || !content) return alert("Uzupełnij wszystkie pola!");

    const reader = new FileReader();
    reader.onload = function(e) {
        articles.unshift({
            title, content, author,
            image: e.target.result,
            date: new Date().toLocaleDateString()
        });
        localStorage.setItem('k007_articles', JSON.stringify(articles));
        alert("Artykuł opublikowany!");
        showPage('articles-page');
    };
    reader.readAsDataURL(file);
}

function renderArticles() {
    const grid = document.getElementById('articles-grid');
    grid.innerHTML = articles.map((a, i) => `
        <div class="article-card" onclick="openArticle(${i})">
            <img src="${a.image}">
            <div class="card-content">
                <h3>${a.title}</h3>
                <p style="font-size:12px; color:gray;">${a.author} | ${a.date}</p>
            </div>
        </div>
    `).join('');
}

function openArticle(i) {
    const a = articles[i];
    document.getElementById('modal-banner').style.backgroundImage = `url('${a.image}')`;
    document.getElementById('modal-title').innerText = a.title;
    document.getElementById('modal-body').innerHTML = a.content.replace(/\n/g, '<br>');
    document.getElementById('modal-footer').innerText = `KANAŁ 007 | ${a.author} | ${a.date}`;
    document.getElementById('article-modal').style.display = 'block';
}

function closeArticle() { document.getElementById('article-modal').style.display = 'none'; }

// Funkcje Admina
function updateAboutText() {
    const text = document.getElementById('edit-about-text').value;
    localStorage.setItem('k007_about_text', text);
    const aboutBox = document.querySelector('.about-us-box p');
    if(aboutBox) aboutBox.innerText = text;
    alert("Zaktualizowano stronę główną.");
}

function deleteArticle(index) {
    if(confirm("Usunąć ten artykuł?")) {
        articles.splice(index, 1);
        localStorage.setItem('k007_articles', JSON.stringify(articles));
        renderAdminTools();
    }
}

function renderAdminTools() {
    document.getElementById('active-agents-list').innerHTML = allowedIDs.map(id => `<li>${id}</li>`).join('');
    const adminArtList = document.getElementById('admin-articles-list');
    if(adminArtList) {
        adminArtList.innerHTML = articles.map((a, i) => `
            <div class="admin-art-item">
                <span>${a.title}</span>
                <button class="btn-delete" onclick="deleteArticle(${i})">Usuń</button>
            </div>
        `).join('');
    }
}

// Poprawiona funkcja renderowania narzędzi admina
function renderAdminTools() {
    // Lista aktywnych dziennikarzy
    const agentsList = document.getElementById('active-agents-list');
    if(agentsList) {
        agentsList.innerHTML = allowedIDs.map(id => `
            <li class="admin-art-item">
                <span>${id}</span>
            </li>
        `).join('');
    }
    
    // Lista artykułów do usuwania
    const adminArtList = document.getElementById('admin-articles-list');
    if(adminArtList) {
        adminArtList.innerHTML = articles.map((a, i) => `
            <div class="admin-art-item">
                <span><strong>${a.title}</strong> (${a.author})</span>
                <button class="btn-delete" onclick="deleteArticle(${i})">Usuń</button>
            </div>
        `).join('');
    }
}

// Funkcja publikacji sondażu
function publishPoll() {
    const title = document.getElementById('poll-title').value;
    const fileInput = document.getElementById('poll-file');
    const file = fileInput.files[0];

    if(!title || !file) return alert("Uzupełnij tytuł i wybierz plik graficzny sondażu!");

    const reader = new FileReader();
    reader.onload = function(e) {
        polls.unshift({
            title: title,
            image: e.target.result
        });
        localStorage.setItem('k007_polls', JSON.stringify(polls));
        alert("Sondaż został opublikowany pomyślnie.");
        
        // Reset formularza
        document.getElementById('poll-title').value = "";
        document.getElementById('poll-file-name').innerText = "Nie wybrano pliku";
        fileInput.value = "";
    };
    reader.readAsDataURL(file);
}

// Obsługa nazwy pliku dla sondażu (dodaj do DOMContentLoaded)
document.addEventListener('change', function(e) {
    if (e.target && e.target.id === 'poll-file') {
        const fileName = e.target.files[0] ? e.target.files[0].name : "Nie wybrano pliku";
        document.getElementById('poll-file-name').innerText = "Wybrano: " + fileName;
    }
});

// Główna funkcja do wyświetlania customowych powiadomień
function showAlert(message) {
    const container = document.getElementById('notification-container');
    const alertBox = document.createElement('div');
    alertBox.className = 'custom-alert';
    alertBox.innerHTML = `
        <span>${message}</span>
        <span style="margin-left:15px; cursor:pointer; opacity:0.5" onclick="this.parentElement.remove()">×</span>
    `;
    
    container.appendChild(alertBox);
    
    // Automatyczne usuwanie po 3 sekundach
    setTimeout(() => {
        if(alertBox) alertBox.remove();
    }, 3000);
}

// Zaktualizowane logowanie Admina
function verifyAdmin() {
    const l = document.getElementById('admin-login-input').value;
    const p = document.getElementById('admin-password-input').value;
    if(l === "ADM007!" && p === "2025007!") {
        showAlert("Zalogowano jako Administrator");
        showPage('admin-dashboard');
    } else {
        showAlert("BŁĄD: Niepoprawne dane logowania!");
    }
}

// Zaktualizowane logowanie Dziennikarza
function loginJournalist() {
    const id = document.getElementById('j-id-input').value.toUpperCase().trim();
    const pass = document.getElementById('j-pass-input').value;
    
    if(!allowedIDs.includes(id)) {
        return showAlert("BŁĄD: Identyfikator nie istnieje w systemie!");
    }
    
    if(!journalistPasses[id]) journalistPasses[id] = pass;
    
    if(journalistPasses[id] === pass) {
        showAlert(`Witaj w systemie, ${id}`);
        showPage('editor-page');
        localStorage.setItem('k007_j_passes', JSON.stringify(journalistPasses));
    } else {
        showAlert("BŁĄD: Hasło nieprawidłowe!");
    }
}

// Możesz teraz użyć showAlert wszędzie, np. w publishArticle:
// showAlert("Artykuł został opublikowany!");

