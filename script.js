// ====================
// FIREBASE CONFIGURATION
// ====================

// KONFIGURACJA FIREBASE - UZUPEŁNIJ SWOIMI DANYMI!
const firebaseConfig = {
  apiKey: "AIzaSyCSGvU2MnspxH7kwF_DdsQdrCNFZ_QcGTs",
  authDomain: "kanal007-4b697.firebaseapp.com",
  databaseURL: "https://kanal007-4b697-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "kanal007-4b697",
  storageBucket: "kanal007-4b697.firebasestorage.app",
  messagingSenderId: "881281183694",
  appId: "1:881281183694:web:25521e894704cc5d8e459f"
};

// Inicjalizuj Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// ====================
// INITIALIZATION
// ====================

// Dane startowe
let articles = [];
let polls = [];
let allowedIDs = [];
let journalistPasses = {};
let currentUser = null;
let currentArticleIndex = null;

// Inicjalizacja po załadowaniu strony
document.addEventListener('DOMContentLoaded', () => {
    // Ukryj loading screen
    setTimeout(() => {
        document.getElementById('loading-screen').style.opacity = '0';
        setTimeout(() => {
            document.getElementById('loading-screen').style.display = 'none';
        }, 500);
    }, 1500);
    
    // Inicjalizuj particles.js
    particlesJS('particles-js', {
        particles: {
            number: { value: 80, density: { enable: true, value_area: 800 } },
            color: { value: "#ff1a1a" },
            shape: { type: "circle" },
            opacity: { value: 0.5, random: true },
            size: { value: 3, random: true },
            line_linked: {
                enable: true,
                distance: 150,
                color: "#ff1a1a",
                opacity: 0.4,
                width: 1
            },
            move: {
                enable: true,
                speed: 2,
                direction: "none",
                random: true,
                straight: false,
                out_mode: "out",
                bounce: false
            }
        },
        interactivity: {
            detect_on: "canvas",
            events: {
                onhover: { enable: true, mode: "repulse" },
                onclick: { enable: true, mode: "push" }
            }
        }
    });
    
    // Ładowanie tekstu o nas z localStorage
    const savedAbout = localStorage.getItem('k007_about_text');
    if(savedAbout) {
        document.getElementById('about-text').innerText = savedAbout;
    }
    
    // Podgląd plików
    setupFilePreviews();
    
    // Załaduj dane z Firebase
    loadArticlesFromFirebase();
    loadPollsFromFirebase();
    loadJournalistsFromFirebase();
    
    // Renderuj początkowe dane
    renderArticles();
    renderPolls();
    
    // Nasłuchuj zmiany tekstu dla liczenia słów
    document.getElementById('art-content').addEventListener('input', updateWordCount);
});

// ====================
// FIREBASE FUNCTIONS
// ====================

// Ładowanie dziennikarzy z Firebase
function loadJournalistsFromFirebase() {
    database.ref('journalists').on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            allowedIDs = Object.keys(data);
            journalistPasses = data;
            updateStatistics();
            
            // Aktualizuj listę w panelu admina
            if (document.getElementById('active-agents-list')) {
                renderAdminTools();
            }
        }
    });
}

// Ładowanie artykułów z Firebase
function loadArticlesFromFirebase() {
    database.ref('articles').orderByChild('date').on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            // Konwertuj obiekt na tablicę
            articles = Object.values(data);
            // Sortuj od najnowszych
            articles.sort((a, b) => new Date(b.date) - new Date(a.date));
            renderArticles();
            updateStatistics();
            
            // Aktualizuj dashboard dziennikarza
            if (currentUser && currentUser.type === 'journalist') {
                renderJournalistDashboard();
            }
        }
    });
}

// Ładowanie sondaży z Firebase
function loadPollsFromFirebase() {
    database.ref('polls').orderByChild('createdAt').on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            polls = Object.values(data);
            polls.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            renderPolls();
            updateStatistics();
        }
    });
}

// ====================
// UTILITIES
// ====================

// Pokazywanie powiadomień
function showAlert(message, type = 'info') {
    const container = document.getElementById('notification-container');
    const alertBox = document.createElement('div');
    alertBox.className = `custom-alert ${type}`;
    alertBox.innerHTML = `
        <span>${message}</span>
        <span style="margin-left:15px; cursor:pointer; opacity:0.7" onclick="this.parentElement.remove()">×</span>
    `;
    
    container.appendChild(alertBox);
    
    // Automatyczne usuwanie po 4 sekundach
    setTimeout(() => {
        if(alertBox.parentElement) {
            alertBox.remove();
        }
    }, 4000);
}

// Aktualizacja statystyk
function updateStatistics() {
    const totalComments = articles.reduce((sum, article) => sum + (article.comments ? article.comments.length : 0), 0);
    
    document.getElementById('articles-count').innerText = articles.length;
    document.getElementById('polls-count').innerText = polls.length;
    document.getElementById('agents-count').innerText = allowedIDs.length;
    document.getElementById('comments-count').innerText = totalComments;
    
    // Statystyki w panelu admina
    document.getElementById('admin-articles-count').innerText = articles.length;
    document.getElementById('admin-polls-count').innerText = polls.length;
    document.getElementById('admin-journalists-count').innerText = allowedIDs.length;
}

// Zapis danych (dla danych lokalnych jak tekst "o nas")
function saveData() {
    // Tylko dla danych lokalnych
    localStorage.setItem('k007_about_text', document.getElementById('about-text').innerText);
}

// ====================
// NAVIGATION & PAGES
// ====================

// Przełączanie stron
function showPage(id) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const target = document.getElementById(id);
    if(target) {
        target.classList.add('active');
        window.scrollTo(0,0);
        
        // Zamykanie modali
        closeArticle();
        closeGate();
        toggleMobileMenu(false);
        
        // Renderuj odpowiednie dane
        if(id === 'articles-page') renderArticles();
        if(id === 'polls-page') renderPolls();
        if(id === 'admin-dashboard') renderAdminTools();
        if(id === 'editor-page') renderJournalistDashboard();
    }
}

// Mobile menu
function toggleMobileMenu(force) {
    const menu = document.querySelector('.mobile-menu');
    if (force !== undefined) {
        menu.classList.toggle('active', force);
    } else {
        menu.classList.toggle('active');
    }
}

// ====================
// GATE & AUTHENTICATION
// ====================

// Bramka dostępu
function openGate() {
    document.getElementById('gate-modal').style.display = 'flex';
}

function closeGate() {
    document.getElementById('gate-modal').style.display = 'none';
}

function showAuth(type) {
    closeGate();
    showPage(type + '-login-page');
}

// Logowanie admina (NIE ZMIENIONE - lokalne)
function verifyAdmin() {
    const login = document.getElementById('admin-login-input').value;
    const password = document.getElementById('admin-password-input').value;
    
    if(login === "Admin7!" && password === "Panel007!") {
        currentUser = { type: 'admin', id: 'ADMIN' };
        showAlert("Zalogowano jako Administrator", "success");
        showPage('admin-dashboard');
    } else {
        showAlert("BŁĄD: Niepoprawne dane logowania!", "error");
    }
}

// Logowanie dziennikarza (ZMIENIONE - Firebase)
function loginJournalist() {
    const id = document.getElementById('j-id-input').value.toUpperCase().trim();
    const pass = document.getElementById('j-pass-input').value;
    
    if(!id || !pass) {
        return showAlert("Wpisz ID i hasło!", "warning");
    }
    
    // Sprawdź w Firebase
    database.ref('journalists/' + id).once('value')
        .then((snapshot) => {
            const journalistData = snapshot.val();
            
            if (!journalistData) {
                return showAlert("BŁĄD: Identyfikator nie istnieje w systemie!", "error");
            }
            
            if (journalistData.password === pass) {
                currentUser = { type: 'journalist', id: id };
                document.getElementById('current-journalist').innerText = id;
                showAlert(`Witaj w systemie, ${id}`, "success");
                showPage('editor-page');
                renderJournalistDashboard();
            } else {
                showAlert("BŁĄD: Hasło nieprawidłowe!", "error");
            }
        })
        .catch((error) => {
            console.error("Firebase error:", error);
            showAlert("Błąd połączenia z bazą danych", "error");
        });
}

function logoutJournalist() {
    currentUser = null;
    showAlert("Wylogowano pomyślnie", "success");
    showPage('home');
}

// ====================
// ARTICLE MANAGEMENT
// ====================

// Publikacja artykułu przez dziennikarza (ZMIENIONE - Firebase)
function publishArticle() {
    if (!currentUser) {
        showAlert("Musisz być zalogowany!", "error");
        return;
    }
    
    const title = document.getElementById('art-title').value.trim();
    const content = document.getElementById('art-content').value.trim();
    const author = document.getElementById('art-author').value.trim() || currentUser.id;
    const tags = document.getElementById('art-tags').value.split(',').map(t => t.trim()).filter(t => t);
    const fileInput = document.getElementById('art-file');
    const file = fileInput.files[0];

    if(!title) return showAlert("Wpisz tytuł artykułu!", "warning");
    if(!content) return showAlert("Wpisz treść artykułu!", "warning");
    if(!file) return showAlert("Dodaj zdjęcie główne!", "warning");

    const reader = new FileReader();
    reader.onload = function(e) {
        const articleId = Date.now();
        const newArticle = {
            id: articleId,
            title: title,
            content: content,
            author: author,
            image: e.target.result,
            date: new Date().toISOString(),
            displayDate: new Date().toLocaleDateString('pl-PL', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }),
            tags: tags,
            likes: 0,
            dislikes: 0,
            views: 0,
            comments: [],
            publishedBy: currentUser.id,
            status: 'published'
        };

        // Zapisz w Firebase
        database.ref('articles/' + articleId).set(newArticle)
            .then(() => {
                resetEditorForm();
                showAlert("Artykuł został opublikowany!", "success");
            })
            .catch((error) => {
                console.error("Firebase error:", error);
                showAlert("Błąd podczas publikacji", "error");
            });
    };
    reader.readAsDataURL(file);
}

// Publikacja artykułu przez admina (ZMIENIONE - Firebase)
function adminPublishArticle() {
    const title = document.getElementById('admin-art-title').value.trim();
    const content = document.getElementById('admin-art-content').value.trim();
    const author = document.getElementById('admin-art-author').value.trim() || "Redakcja 007";
    const customDate = document.getElementById('admin-art-date').value;
    const fileInput = document.getElementById('admin-art-file');
    const file = fileInput.files[0];

    if(!title || !content || !file) {
        return showAlert("Wypełnij wszystkie wymagane pola!", "warning");
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const articleId = Date.now();
        const dateObj = customDate ? new Date(customDate) : new Date();
        
        const newArticle = {
            id: articleId,
            title: title,
            content: content,
            author: author,
            image: e.target.result,
            date: dateObj.toISOString(),
            displayDate: dateObj.toLocaleDateString('pl-PL', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }),
            tags: ['admin', 'ważne'],
            likes: 0,
            dislikes: 0,
            views: 0,
            comments: [],
            publishedBy: 'ADMIN',
            status: 'published'
        };

        // Zapisz w Firebase
        database.ref('articles/' + articleId).set(newArticle)
            .then(() => {
                // Reset formularza
                document.getElementById('admin-art-title').value = '';
                document.getElementById('admin-art-content').value = '';
                document.getElementById('admin-art-file-name').innerText = 'Nie wybrano pliku';
                
                showAlert("Artykuł opublikowany przez administratora!", "success");
            })
            .catch((error) => {
                console.error("Firebase error:", error);
                showAlert("Błąd podczas publikacji", "error");
            });
    };
    reader.readAsDataURL(file);
}

// Renderowanie artykułów
function renderArticles() {
    const grid = document.getElementById('articles-grid');
    if(!grid) return;
    
    const searchTerm = document.getElementById('article-search')?.value.toLowerCase() || '';
    const sortBy = document.getElementById('sort-articles')?.value || 'newest';
    
    let filtered = articles.filter(article => 
        article.title.toLowerCase().includes(searchTerm) ||
        article.content.toLowerCase().includes(searchTerm) ||
        article.author.toLowerCase().includes(searchTerm)
    );
    
    // Sortowanie
    filtered.sort((a, b) => {
        switch(sortBy) {
            case 'oldest':
                return new Date(a.date) - new Date(b.date);
            case 'popular':
                return (b.likes - b.dislikes) - (a.likes - a.dislikes);
            default: // newest
                return new Date(b.date) - new Date(a.date);
        }
    });
    
    grid.innerHTML = filtered.map((article, index) => `
        <div class="article-card" onclick="openArticle(${index})">
            <img src="${article.image}" alt="${article.title}" loading="lazy">
            <div class="card-content">
                <h3>${article.title}</h3>
                <p>${article.content.substring(0, 150).replace(/<[^>]*>/g, '')}...</p>
                <div class="article-stats">
                    <span><i class="fas fa-user"></i> ${article.author}</span>
                    <span><i class="fas fa-calendar"></i> ${article.displayDate || article.date}</span>
                    <span><i class="fas fa-thumbs-up"></i> ${article.likes || 0}</span>
                </div>
            </div>
        </div>
    `).join('');
}

// Filtrowanie artykułów
function filterArticles() {
    renderArticles();
}

function sortArticles() {
    renderArticles();
}

// ====================
// POLLS MANAGEMENT (WYNIKI SONDARZY)
// ====================

// Publikacja sondażu (ZMIENIONE - Firebase)
function publishPoll() {
    const title = document.getElementById('poll-title').value.trim();
    const description = document.getElementById('poll-description').value.trim();
    const file = document.getElementById('poll-file').files[0];
    
    if(!title || !file) {
        return showAlert("Wpisz tytuł i dodaj grafikę sondażu!", "warning");
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const pollId = Date.now();
        const newPoll = {
            id: pollId,
            title: title,
            description: description || '',
            image: e.target.result,
            date: new Date().toLocaleDateString('pl-PL', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }),
            createdAt: new Date().toISOString()
        };
        
        // Zapisz w Firebase
        database.ref('polls/' + pollId).set(newPoll)
            .then(() => {
                // Reset formularza
                document.getElementById('poll-title').value = '';
                document.getElementById('poll-description').value = '';
                document.getElementById('poll-file-name').innerText = 'Nie wybrano pliku';
                
                showAlert("Sondaż opublikowany!", "success");
            })
            .catch((error) => {
                console.error("Firebase error:", error);
                showAlert("Błąd podczas publikacji", "error");
            });
    };
    reader.readAsDataURL(file);
}

// Renderowanie sondaży
function renderPolls() {
    const container = document.getElementById('polls-container');
    if(!container) return;
    
    container.innerHTML = polls.map((poll, index) => `
        <div class="poll-card" onclick="openPoll(${index})">
            <img src="${poll.image}" alt="${poll.title}" loading="lazy">
            <div class="poll-info">
                <h3>${poll.title}</h3>
                ${poll.description ? `<p>${poll.description.substring(0, 100)}${poll.description.length > 100 ? '...' : ''}</p>` : ''}
                <div class="poll-date">
                    <i class="fas fa-calendar"></i>
                    <span>${poll.date}</span>
                </div>
            </div>
        </div>
    `).join('');
}

// Otwieranie sondażu w modalu
function openPoll(index) {
    const poll = polls[index];
    
    document.getElementById('poll-modal-title').innerText = poll.title;
    document.getElementById('poll-modal-description').innerText = poll.description || '';
    document.getElementById('poll-modal-date').innerHTML = `<i class="fas fa-calendar"></i> ${poll.date}`;
    document.getElementById('poll-modal-image').style.backgroundImage = `url('${poll.image}')`;
    
    document.getElementById('poll-modal').style.display = 'flex';
}

function closePollModal() {
    document.getElementById('poll-modal').style.display = 'none';
}

// ====================
// ARTICLE VIEWER & REACTIONS SYSTEM
// ====================

// Otwieranie artykułu (ZMIENIONE - aktualizacja w Firebase)
function openArticle(index) {
    currentArticleIndex = index;
    const article = articles[index];
    
    if (!article) return;
    
    // Zwiększ licznik wyświetleń w Firebase
    const newViews = (article.views || 0) + 1;
    database.ref('articles/' + article.id + '/views').set(newViews);
    
    // Aktualizuj lokalnie
    article.views = newViews;
    
    // Aktualizuj UI
    document.getElementById('modal-banner').style.backgroundImage = `url('${article.image}')`;
    document.getElementById('modal-title').innerText = article.title;
    document.getElementById('modal-body').innerHTML = article.content;
    document.getElementById('modal-author').innerText = article.author;
    document.getElementById('modal-date').innerText = article.displayDate || article.date;
    document.getElementById('modal-views').innerText = article.views || 0;
    
    // Tagi
    const tagsContainer = document.getElementById('modal-tags');
    tagsContainer.innerHTML = (article.tags || []).map(tag => 
        `<span>${tag}</span>`
    ).join('');
    
    // Renderuj komentarze
    renderComments();
    
    // Aktualizuj reakcje
    updateReactionUI();
    
    // Pokaż modal
    document.getElementById('article-modal').style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function closeArticle() {
    document.getElementById('article-modal').style.display = 'none';
    document.body.style.overflow = 'auto';
}

// ====================
// LIKES/DISLIKES SYSTEM (ZMIENIONE - Firebase)
// ====================

// Funkcja dodająca/zmieniająca like
function addLike() {
    if(currentArticleIndex === null) return;
    
    const article = articles[currentArticleIndex];
    const userId = getUserId();
    
    // Sprawdź obecną reakcję użytkownika
    database.ref('articleReactions/' + article.id + '/' + userId).once('value')
        .then((snapshot) => {
            const currentReaction = snapshot.val();
            let newLikes = article.likes || 0;
            let newDislikes = article.dislikes || 0;
            
            if (currentReaction === 'like') {
                // Usuń like
                database.ref('articleReactions/' + article.id + '/' + userId).remove();
                newLikes = Math.max(0, newLikes - 1);
                showAlert("Usunięto polubienie", "info");
            } else {
                // Dodaj like
                database.ref('articleReactions/' + article.id + '/' + userId).set('like');
                newLikes = newLikes + 1;
                
                // Jeśli miał dislike, usuń go
                if (currentReaction === 'dislike') {
                    newDislikes = Math.max(0, newDislikes - 1);
                }
                
                showAlert("Polubiłeś ten artykuł!", "success");
            }
            
            // Aktualizuj liczniki w Firebase
            database.ref('articles/' + article.id).update({
                likes: newLikes,
                dislikes: newDislikes
            });
            
            // Aktualizuj lokalnie
            article.likes = newLikes;
            article.dislikes = newDislikes;
            
            // Aktualizuj UI
            updateReactionUI();
        })
        .catch((error) => {
            console.error("Firebase error:", error);
            showAlert("Błąd podczas aktualizacji reakcji", "error");
        });
}

// Funkcja dodająca/zmieniająca dislike
function addDislike() {
    if(currentArticleIndex === null) return;
    
    const article = articles[currentArticleIndex];
    const userId = getUserId();
    
    // Sprawdź obecną reakcję użytkownika
    database.ref('articleReactions/' + article.id + '/' + userId).once('value')
        .then((snapshot) => {
            const currentReaction = snapshot.val();
            let newLikes = article.likes || 0;
            let newDislikes = article.dislikes || 0;
            
            if (currentReaction === 'dislike') {
                // Usuń dislike
                database.ref('articleReactions/' + article.id + '/' + userId).remove();
                newDislikes = Math.max(0, newDislikes - 1);
                showAlert("Usunięto niepolubienie", "info");
            } else {
                // Dodaj dislike
                database.ref('articleReactions/' + article.id + '/' + userId).set('dislike');
                newDislikes = newDislikes + 1;
                
                // Jeśli miał like, usuń go
                if (currentReaction === 'like') {
                    newLikes = Math.max(0, newLikes - 1);
                }
                
                showAlert("Nie spodobał Ci się ten artykuł", "info");
            }
            
            // Aktualizuj liczniki w Firebase
            database.ref('articles/' + article.id).update({
                likes: newLikes,
                dislikes: newDislikes
            });
            
            // Aktualizuj lokalnie
            article.likes = newLikes;
            article.dislikes = newDislikes;
            
            // Aktualizuj UI
            updateReactionUI();
        })
        .catch((error) => {
            console.error("Firebase error:", error);
            showAlert("Błąd podczas aktualizacji reakcji", "error");
        });
}

// Pobierz unikalny ID użytkownika (NIE ZMIENIONE)
function getUserId() {
    let userId = localStorage.getItem('k007_user_id');
    if(!userId) {
        userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('k007_user_id', userId);
    }
    return userId;
}

// Sprawdź reakcję użytkownika dla danego artykułu (ZMIENIONE - Firebase)
function getUserReaction(articleId, userId) {
    // To będzie asynchroniczne, ale dla uproszczenia zwracamy null
    // UI będzie aktualizowane przez updateReactionUI
    return null;
}

// Aktualizuj UI reakcji (ZMIENIONE - Firebase)
function updateReactionUI() {
    if(currentArticleIndex === null) return;
    
    const article = articles[currentArticleIndex];
    const userId = getUserId();
    
    // Sprawdź reakcję użytkownika
    database.ref('articleReactions/' + article.id + '/' + userId).once('value')
        .then((snapshot) => {
            const userReaction = snapshot.val();
            
            // Aktualizuj liczniki
            document.getElementById('like-count').innerText = article.likes || 0;
            document.getElementById('dislike-count').innerText = article.dislikes || 0;
            
            // Pobierz przyciski
            const likeBtn = document.querySelector('.like-btn');
            const dislikeBtn = document.querySelector('.dislike-btn');
            
            // Resetuj wszystkie klasy
            likeBtn.classList.remove('active', 'reaction-animation');
            dislikeBtn.classList.remove('active', 'reaction-animation');
            
            // Dodaj klasy aktywne
            if(userReaction === 'like') {
                likeBtn.classList.add('active');
            } else if(userReaction === 'dislike') {
                dislikeBtn.classList.add('active');
            }
        })
        .catch((error) => {
            console.error("Firebase error:", error);
        });
}

// ====================
// COMMENTS SYSTEM (ZMIENIONE - Firebase)
// ====================

function postComment() {
    if(currentArticleIndex === null) return;
    
    const article = articles[currentArticleIndex];
    const nick = document.getElementById('comment-nick').value.trim();
    const text = document.getElementById('comment-text').value.trim();
    
    if(!nick || !text) {
        return showAlert("Wpisz nick i treść komentarza!", "warning");
    }
    
    const commentId = Date.now();
    const newComment = {
        id: commentId,
        nick: nick,
        text: text,
        date: new Date().toLocaleString('pl-PL'),
        likes: 0,
        likedBy: []
    };
    
    // Zapisz komentarz w Firebase
    database.ref('articles/' + article.id + '/comments/' + commentId).set(newComment)
        .then(() => {
            // Reset formularza
            document.getElementById('comment-nick').value = '';
            document.getElementById('comment-text').value = '';
            
            showAlert("Komentarz dodany!", "success");
        })
        .catch((error) => {
            console.error("Firebase error:", error);
            showAlert("Błąd podczas dodawania komentarza", "error");
        });
}

function renderComments() {
    if(currentArticleIndex === null) return;
    
    const list = document.getElementById('comments-list');
    const article = articles[currentArticleIndex];
    const comments = article.comments || [];
    
    // Sortuj komentarze od najnowszych
    const sortedComments = Object.values(comments).sort((a, b) => b.id - a.id);
    
    list.innerHTML = sortedComments.map(comment => {
        return `
        <div class="comment-item" data-id="${comment.id}">
            <div class="comment-header">
                <div class="comment-author">
                    <i class="fas fa-user"></i>
                    ${comment.nick}
                </div>
                <div class="comment-date">
                    ${comment.date}
                </div>
            </div>
            <div class="comment-text">
                ${comment.text}
            </div>
            <div class="comment-actions">
                <button class="like-comment-btn" onclick="likeComment(${comment.id})">
                    <i class="fas fa-thumbs-up"></i> 
                    <span class="comment-like-count">${comment.likes || 0}</span>
                </button>
            </div>
        </div>
        `;
    }).join('');
}

function likeComment(commentId) {
    if(currentArticleIndex === null) return;
    
    const article = articles[currentArticleIndex];
    const userId = getUserId();
    
    // Sprawdź czy użytkownik już polubił komentarz
    const comment = article.comments[commentId];
    if (!comment) return;
    
    const likedBy = comment.likedBy || [];
    const userIndex = likedBy.indexOf(userId);
    
    if(userIndex > -1) {
        // Usuń like
        likedBy.splice(userIndex, 1);
        const newLikes = Math.max(0, (comment.likes || 1) - 1);
        
        database.ref('articles/' + article.id + '/comments/' + commentId).update({
            likes: newLikes,
            likedBy: likedBy
        });
        
        showAlert("Usunięto polubienie komentarza", "info");
    } else {
        // Dodaj like
        likedBy.push(userId);
        const newLikes = (comment.likes || 0) + 1;
        
        database.ref('articles/' + article.id + '/comments/' + commentId).update({
            likes: newLikes,
            likedBy: likedBy
        });
        
        showAlert("Polubiłeś komentarz!", "success");
    }
}

// ====================
// ADMIN PANEL
// ====================

function renderAdminTools() {
    // Renderuj dziennikarzy
    const agentsList = document.getElementById('active-agents-list');
    agentsList.innerHTML = allowedIDs.map(id => `
        <li class="admin-art-item">
            <span><strong>${id}</strong></span>
            <div>
                <button class="btn-delete" onclick="removeAgent('${id}')">
                    <i class="fas fa-trash"></i> Usuń
                </button>
            </div>
        </li>
    `).join('');
    
    // Renderuj artykuły do usunięcia
    const articlesList = document.getElementById('admin-articles-list');
    articlesList.innerHTML = articles.slice(0, 10).map((article, index) => `
        <div class="admin-art-item">
            <span>${article.title.substring(0, 50)}...</span>
            <button class="btn-delete" onclick="deleteArticle('${article.id}')">
                <i class="fas fa-trash"></i> Usuń
            </button>
        </div>
    `).join('');
    
    // Renderuj sondaże do usunięcia
    const pollsList = document.getElementById('admin-polls-list');
    pollsList.innerHTML = polls.slice(0, 10).map((poll, index) => `
        <div class="admin-art-item">
            <span>${poll.title.substring(0, 50)}...</span>
            <button class="btn-delete" onclick="deletePoll('${poll.id}')">
                <i class="fas fa-trash"></i> Usuń
            </button>
        </div>
    `).join('');
    
    // Aktualizuj liczniki
    updateStatistics();
}

function addAgent() {
    const newId = document.getElementById('new-agent-id').value.toUpperCase().trim();
    
    if(!newId) {
        return showAlert("Wpisz ID dziennikarza!", "warning");
    }
    
    const newPass = prompt("Ustaw hasło dla dziennikarza " + newId);
    if (!newPass) {
        return showAlert("Hasło jest wymagane!", "warning");
    }
    
    // Sprawdź czy już istnieje
    if(allowedIDs.includes(newId)) {
        return showAlert("Ten ID już istnieje!", "warning");
    }
    
    // Dodaj do Firebase
    database.ref('journalists/' + newId).set({
        password: newPass,
        created: new Date().toISOString(),
        createdBy: currentUser ? currentUser.id : 'ADMIN'
    })
    .then(() => {
        document.getElementById('new-agent-id').value = '';
        showAlert(`Dodano dziennikarza: ${newId}`, "success");
    })
    .catch((error) => {
        console.error("Firebase error:", error);
        showAlert("Błąd podczas dodawania dziennikarza", "error");
    });
}

function removeAgent(id) {
    if(allowedIDs.length <= 1) {
        return showAlert("Musi pozostać przynajmniej jeden dziennikarz!", "error");
    }
    
    if(confirm(`Czy na pewno usunąć dziennikarza ${id}?`)) {
        database.ref('journalists/' + id).remove()
            .then(() => {
                showAlert(`Usunięto dziennikarza: ${id}`, "success");
            })
            .catch((error) => {
                console.error("Firebase error:", error);
                showAlert("Błąd podczas usuwania", "error");
            });
    }
}

function deleteArticle(articleId) {
    if(confirm("Czy na pewno usunąć ten artykuł? Tej operacji nie można cofnąć.")) {
        database.ref('articles/' + articleId).remove()
            .then(() => {
                showAlert("Artykuł został usunięty", "success");
            })
            .catch((error) => {
                console.error("Firebase error:", error);
                showAlert("Błąd podczas usuwania", "error");
            });
    }
}

function deletePoll(pollId) {
    if(confirm("Czy na pewno usunąć ten sondaż?")) {
        database.ref('polls/' + pollId).remove()
            .then(() => {
                showAlert("Sondaż został usunięty", "success");
            })
            .catch((error) => {
                console.error("Firebase error:", error);
                showAlert("Błąd podczas usuwania", "error");
            });
    }
}

// ====================
// JOURNALIST PANEL
// ====================

function renderJournalistDashboard() {
    if(!currentUser) return;
    
    const myArticles = articles.filter(article => article.publishedBy === currentUser.id);
    const container = document.getElementById('my-articles-list');
    
    container.innerHTML = myArticles.slice(0, 5).map(article => `
        <div class="my-article-item">
            <div class="my-article-info">
                <h4>${article.title.substring(0, 60)}${article.title.length > 60 ? '...' : ''}</h4>
                <span>${article.displayDate || article.date}</span>
            </div>
            <div class="my-article-stats">
                <span><i class="fas fa-thumbs-up"></i> ${article.likes || 0}</span>
                <span><i class="fas fa-comment"></i> ${article.comments ? Object.keys(article.comments).length : 0}</span>
                <span><i class="fas fa-eye"></i> ${article.views || 0}</span>
            </div>
        </div>
    `).join('');
}

function resetEditorForm() {
    document.getElementById('art-title').value = '';
    document.getElementById('art-content').value = '';
    document.getElementById('art-tags').value = '';
    document.getElementById('file-preview').innerHTML = '';
    updateWordCount();
}

function updateWordCount() {
    const text = document.getElementById('art-content').value;
    const words = text.trim().split(/\s+/).filter(word => word.length > 0);
    document.getElementById('word-count').innerText = words.length;
}

function formatText(command) {
    const textarea = document.getElementById('art-content');
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    
    let formattedText = '';
    
    switch(command) {
        case 'bold':
            formattedText = `<strong>${selectedText}</strong>`;
            break;
        case 'italic':
            formattedText = `<em>${selectedText}</em>`;
            break;
        case 'underline':
            formattedText = `<u>${selectedText}</u>`;
            break;
    }
    
    textarea.value = textarea.value.substring(0, start) + formattedText + textarea.value.substring(end);
    textarea.focus();
    textarea.setSelectionRange(start + formattedText.length, start + formattedText.length);
}

function insertHeading() {
    const textarea = document.getElementById('art-content');
    const start = textarea.selectionStart;
    const heading = '<h3>Tutaj wpisz nagłówek</h3>\n';
    
    textarea.value = textarea.value.substring(0, start) + heading + textarea.value.substring(start);
    textarea.focus();
    textarea.setSelectionRange(start + 28, start + 47);
}

function insertImage() {
    const url = prompt('Wklej URL obrazka:');
    if(url) {
        const textarea = document.getElementById('art-content');
        const start = textarea.selectionStart;
        const img = `<img src="${url}" alt="Opis obrazka" style="max-width:100%; border-radius:10px; margin:20px 0;">\n`;
        
        textarea.value = textarea.value.substring(0, start) + img + textarea.value.substring(start);
        textarea.focus();
    }
}

function insertLink() {
    const url = prompt('Wklej URL linka:');
    const text = prompt('Tekst linka:');
    
    if(url && text) {
        const textarea = document.getElementById('art-content');
        const start = textarea.selectionStart;
        const link = `<a href="${url}" target="_blank">${text}</a>`;
        
        textarea.value = textarea.value.substring(0, start) + link + textarea.value.substring(start);
        textarea.focus();
    }
}

// ====================
// FILE HANDLING
// ====================

function setupFilePreviews() {
    // Podgląd dla dziennikarza
    const journalistFileInput = document.getElementById('art-file');
    if(journalistFileInput) {
        journalistFileInput.addEventListener('change', function() {
            const file = this.files[0];
            if(file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    document.getElementById('file-preview').innerHTML = `
                        <img src="${e.target.result}" alt="Podgląd">
                    `;
                };
                reader.readAsDataURL(file);
            }
        });
    }
    
    // Podgląd dla admina - artykuły
    const adminArtFile = document.getElementById('admin-art-file');
    if(adminArtFile) {
        adminArtFile.addEventListener('change', function() {
            const fileName = this.files[0] ? this.files[0].name : "Nie wybrano pliku";
            document.getElementById('admin-art-file-name').innerText = fileName;
        });
    }
    
    // Podgląd dla admina - sondaże
    const pollFile = document.getElementById('poll-file');
    if(pollFile) {
        pollFile.addEventListener('change', function() {
            const fileName = this.files[0] ? this.files[0].name : "Nie wybrano pliku";
            document.getElementById('poll-file-name').innerText = fileName;
        });
    }
}

// ====================
// ADMIN ACTIONS
// ====================

function exportData() {
    const data = {
        articles: articles,
        polls: polls,
        journalists: allowedIDs,
        exportDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `k007_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showAlert("Dane zostały wyeksportowane", "success");
}

function backupData() {
    const backup = {
        articles: articles,
        polls: polls,
        allowedIDs: allowedIDs,
        journalistPasses: journalistPasses,
        backupDate: new Date().toISOString()
    };
    
    localStorage.setItem('k007_backup', JSON.stringify(backup));
    showAlert("Kopia zapasowa została utworzona", "success");
}

function clearAllData() {
    if(confirm("UWAGA! Czy na pewno chcesz wyczyścić WSZYSTKIE dane z Firebase? Tej operacji NIE można cofnąć!")) {
        if(confirm("Potwierdź usunięcie wszystkich danych. Wszystkie artykuły, sondaże i dziennikarze zostaną usunięte.")) {
            // Usuń wszystko z Firebase
            database.ref('articles').remove();
            database.ref('polls').remove();
            database.ref('journalists').remove();
            database.ref('articleReactions').remove();
            
            // Dodaj domyślnego dziennikarza
            database.ref('journalists/DZIENNIKARZ001').set({
                password: 'haslo001',
                created: new Date().toISOString(),
                createdBy: 'SYSTEM'
            });
            
            showAlert("Wszystkie dane zostały usunięte z Firebase", "warning");
        }
    }
}

// ====================
// ADDITIONAL FUNCTIONS
// ====================

function shareArticle() {
    if(currentArticleIndex !== null) {
        const article = articles[currentArticleIndex];
        const url = window.location.href;
        const text = `Sprawdź ten artykuł: "${article.title}" na KANAŁ 007`;
        
        if(navigator.share) {
            navigator.share({
                title: article.title,
                text: text,
                url: url
            });
        } else {
            navigator.clipboard.writeText(`${text} ${url}`);
            showAlert("Link skopiowany do schowka!", "success");
        }
    }
}

function saveArticle() {
    if(currentArticleIndex !== null) {
        const saved = JSON.parse(localStorage.getItem('k007_saved_articles')) || [];
        const article = articles[currentArticleIndex];
        
        if(!saved.find(a => a.id === article.id)) {
            saved.push(article);
            localStorage.setItem('k007_saved_articles', JSON.stringify(saved));
            showAlert("Artykuł zapisany do ulubionych!", "success");
        } else {
            showAlert("Artykuł jest już zapisany", "info");
        }
    }
}

// ====================
// EVENT LISTENERS
// ====================

// Zamykanie modali po kliknięciu poza
window.onclick = function(event) {
    const articleModal = document.getElementById('article-modal');
    if(event.target === articleModal) {
        closeArticle();
    }
    
    const gateModal = document.getElementById('gate-modal');
    if(event.target === gateModal) {
        closeGate();
    }
    
    const pollModal = document.getElementById('poll-modal');
    if(event.target === pollModal) {
        closePollModal();
    }
};

// Obsługa klawisza Escape
document.addEventListener('keydown', function(event) {
    if(event.key === 'Escape') {
        closeArticle();
        closeGate();
        closePollModal();
    }
});

