// ====================
// FIREBASE CONFIGURATION
// ====================

const firebaseConfig = {
  apiKey: "AIzaSyCSGvU2MnspxH7kwF_DdsQdrCNFZ_QcGTs",
  authDomain: "kanal007-4b697.firebaseapp.com",
  databaseURL: "https://kanal007-4b697-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "kanal007-4b697",
  storageBucket: "kanal007-4b697.firebasestorage.app",
  messagingSenderId: "881281183694",
  appId: "1:881281183694:web:25521e894704cc5d8e459f"
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// ====================
// GLOBAL VARIABLES
// ====================

let articles = [];
let polls = [];
let allowedIDs = [];
let journalistPasses = {};
let currentUser = null;
let currentArticleIndex = null;

// ====================
// INITIALIZATION
// ====================

document.addEventListener('DOMContentLoaded', () => {
    // Loading screen
    setTimeout(() => {
        document.getElementById('loading-screen').style.opacity = '0';
        setTimeout(() => {
            document.getElementById('loading-screen').style.display = 'none';
        }, 500);
    }, 1500);
    
    // Particles.js
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
    
    // Load data from Firebase
    loadJournalistsFromFirebase();
    loadArticlesFromFirebase();
    loadPollsFromFirebase();
    
    // Setup file previews
    setupFilePreviews();
    
    // Word count
    const artContent = document.getElementById('art-content');
    if(artContent) {
        artContent.addEventListener('input', updateWordCount);
    }
});

// ====================
// FIREBASE DATA LOADING
// ====================

function loadJournalistsFromFirebase() {
    database.ref('journalists').on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            allowedIDs = Object.keys(data);
            journalistPasses = data;
            updateStatistics();
            if (document.getElementById('active-agents-list')) {
                renderAdminTools();
            }
        } else {
            // Create default journalist if none exist
            if(allowedIDs.length === 0) {
                database.ref('journalists/DZIENNIKARZ001').set({
                    password: 'haslo001',
                    created: new Date().toISOString(),
                    createdBy: 'SYSTEM'
                });
            }
        }
    });
}

function loadArticlesFromFirebase() {
    database.ref('articles').on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            articles = Object.values(data);
            articles.sort((a, b) => new Date(b.date) - new Date(a.date));
            renderArticles();
            updateStatistics();
            if (currentUser && currentUser.type === 'journalist') {
                renderJournalistDashboard();
            }
        } else {
            articles = [];
            renderArticles();
            updateStatistics();
        }
    });
}

function loadPollsFromFirebase() {
    database.ref('polls').on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            polls = Object.values(data);
            polls.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            renderPolls();
            updateStatistics();
        } else {
            polls = [];
            renderPolls();
            updateStatistics();
        }
    });
}

// ====================
// UTILITIES
// ====================

function showAlert(message, type = 'info') {
    const container = document.getElementById('notification-container');
    const alertBox = document.createElement('div');
    alertBox.className = `custom-alert ${type}`;
    alertBox.innerHTML = `
        <span>${message}</span>
        <span style="margin-left:15px; cursor:pointer; opacity:0.7" onclick="this.parentElement.remove()">×</span>
    `;
    
    container.appendChild(alertBox);
    
    setTimeout(() => {
        if(alertBox.parentElement) {
            alertBox.remove();
        }
    }, 4000);
}

function updateStatistics() {
    const totalComments = articles.reduce((sum, article) => {
        return sum + (article.comments ? Object.keys(article.comments).length : 0);
    }, 0);
    
    // Home page stats
    const articlesCount = document.getElementById('articles-count');
    const pollsCount = document.getElementById('polls-count');
    const agentsCount = document.getElementById('agents-count');
    const commentsCount = document.getElementById('comments-count');
    
    if(articlesCount) articlesCount.innerText = articles.length;
    if(pollsCount) pollsCount.innerText = polls.length;
    if(agentsCount) agentsCount.innerText = allowedIDs.length;
    if(commentsCount) commentsCount.innerText = totalComments;
    
    // Admin panel stats
    const adminArticlesCount = document.getElementById('admin-articles-count');
    const adminPollsCount = document.getElementById('admin-polls-count');
    const adminJournalistsCount = document.getElementById('admin-journalists-count');
    
    if(adminArticlesCount) adminArticlesCount.innerText = articles.length;
    if(adminPollsCount) adminPollsCount.innerText = polls.length;
    if(adminJournalistsCount) adminJournalistsCount.innerText = allowedIDs.length;
}

// ====================
// NAVIGATION
// ====================

function showPage(id) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const target = document.getElementById(id);
    if(target) {
        target.classList.add('active');
        window.scrollTo(0,0);
        
        closeArticle();
        closeGate();
        toggleMobileMenu(false);
        
        if(id === 'articles-page') renderArticles();
        if(id === 'polls-page') renderPolls();
        if(id === 'admin-dashboard') renderAdminTools();
        if(id === 'editor-page') renderJournalistDashboard();
    }
}

function toggleMobileMenu(force) {
    const menu = document.querySelector('.mobile-menu');
    if (force !== undefined) {
        menu.classList.toggle('active', force);
    } else {
        menu.classList.toggle('active');
    }
}

// ====================
// AUTHENTICATION
// ====================

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

// Admin login (LOCAL - not changed)
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

// Journalist login (FIREBASE)
function loginJournalist() {
    const id = document.getElementById('j-id-input').value.toUpperCase().trim();
    const pass = document.getElementById('j-pass-input').value;
    
    if(!id || !pass) {
        return showAlert("Wpisz ID i hasło!", "warning");
    }
    
    database.ref('journalists/' + id).once('value')
        .then((snapshot) => {
            const journalistData = snapshot.val();
            
            if (!journalistData) {
                return showAlert("BŁĄD: Identyfikator nie istnieje!", "error");
            }
            
            if (journalistData.password === pass) {
                currentUser = { type: 'journalist', id: id };
                const currentJournalist = document.getElementById('current-journalist');
                if(currentJournalist) currentJournalist.innerText = id;
                showAlert(`Witaj, ${id}`, "success");
                showPage('editor-page');
                renderJournalistDashboard();
            } else {
                showAlert("BŁĄD: Nieprawidłowe hasło!", "error");
            }
        })
        .catch((error) => {
            console.error("Firebase error:", error);
            showAlert("Błąd połączenia z bazą", "error");
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

function publishArticle() {
    if (!currentUser || currentUser.type !== 'journalist') {
        showAlert("Musisz być zalogowany jako dziennikarz!", "error");
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
        const articleId = 'art_' + Date.now();
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
            comments: {},
            publishedBy: currentUser.id,
            status: 'published'
        };

        database.ref('articles/' + articleId).set(newArticle)
            .then(() => {
                resetEditorForm();
                showAlert("Artykuł opublikowany!", "success");
            })
            .catch((error) => {
                console.error("Firebase error:", error);
                showAlert("Błąd podczas publikacji", "error");
            });
    };
    reader.readAsDataURL(file);
}

function adminPublishArticle() {
    const title = document.getElementById('admin-art-title').value.trim();
    const content = document.getElementById('admin-art-content').value.trim();
    const author = document.getElementById('admin-art-author').value.trim() || "Redakcja 007";
    const customDate = document.getElementById('admin-art-date').value;
    const fileInput = document.getElementById('admin-art-file');
    const file = fileInput.files[0];

    if(!title || !content || !file) {
        return showAlert("Wypełnij wszystkie pola!", "warning");
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const articleId = 'art_' + Date.now();
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
            comments: {},
            publishedBy: 'ADMIN',
            status: 'published'
        };

        database.ref('articles/' + articleId).set(newArticle)
            .then(() => {
                document.getElementById('admin-art-title').value = '';
                document.getElementById('admin-art-content').value = '';
                const adminArtFileName = document.getElementById('admin-art-file-name');
                if(adminArtFileName) adminArtFileName.innerText = 'Nie wybrano pliku';
                
                showAlert("Artykuł opublikowany przez admina!", "success");
            })
            .catch((error) => {
                console.error("Firebase error:", error);
                showAlert("Błąd podczas publikacji", "error");
            });
    };
    reader.readAsDataURL(file);
}

function renderArticles() {
    const grid = document.getElementById('articles-grid');
    if(!grid) return;
    
    const searchInput = document.getElementById('article-search');
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
    const sortSelect = document.getElementById('sort-articles');
    const sortBy = sortSelect ? sortSelect.value : 'newest';
    
    let filtered = articles.filter(article => 
        article.title.toLowerCase().includes(searchTerm) ||
        article.content.toLowerCase().includes(searchTerm) ||
        article.author.toLowerCase().includes(searchTerm)
    );
    
    filtered.sort((a, b) => {
        switch(sortBy) {
            case 'oldest':
                return new Date(a.date) - new Date(b.date);
            case 'popular':
                return (b.likes - b.dislikes) - (a.likes - a.dislikes);
            default:
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
                    <span><i class="fas fa-eye"></i> ${article.views || 0}</span>
                </div>
            </div>
        </div>
    `).join('');
}

function filterArticles() {
    renderArticles();
}

function sortArticles() {
    renderArticles();
}

// ====================
// POLL MANAGEMENT
// ====================

function publishPoll() {
    const title = document.getElementById('poll-title').value.trim();
    const description = document.getElementById('poll-description').value.trim();
    const file = document.getElementById('poll-file').files[0];
    
    if(!title || !file) {
        return showAlert("Wpisz tytuł i dodaj grafikę!", "warning");
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const pollId = 'poll_' + Date.now();
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
        
        database.ref('polls/' + pollId).set(newPoll)
            .then(() => {
                document.getElementById('poll-title').value = '';
                document.getElementById('poll-description').value = '';
                const pollFileName = document.getElementById('poll-file-name');
                if(pollFileName) pollFileName.innerText = 'Nie wybrano pliku';
                
                showAlert("Sondaż opublikowany!", "success");
            })
            .catch((error) => {
                console.error("Firebase error:", error);
                showAlert("Błąd podczas publikacji", "error");
            });
    };
    reader.readAsDataURL(file);
}

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

function openPoll(index) {
    const poll = polls[index];
    if(!poll) return;
    
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
// ARTICLE VIEWER
// ====================

function openArticle(index) {
    currentArticleIndex = index;
    const article = articles[index];
    
    if (!article) return;
    
    // Increment views
    const newViews = (article.views || 0) + 1;
    database.ref('articles/' + article.id + '/views').set(newViews);
    
    // Update UI
    document.getElementById('modal-banner').style.backgroundImage = `url('${article.image}')`;
    document.getElementById('modal-title').innerText = article.title;
    document.getElementById('modal-body').innerHTML = article.content;
    document.getElementById('modal-author').innerText = article.author;
    document.getElementById('modal-date').innerText = article.displayDate || article.date;
    document.getElementById('modal-views').innerText = newViews;
    
    // Tags
    const tagsContainer = document.getElementById('modal-tags');
    if(tagsContainer) {
        tagsContainer.innerHTML = (article.tags || []).map(tag => 
            `<span>${tag}</span>`
        ).join('');
    }
    
    // Render comments
    renderComments();
    
    // Update reactions
    updateReactionUI();
    
    // Show modal
    document.getElementById('article-modal').style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function closeArticle() {
    document.getElementById('article-modal').style.display = 'none';
    document.body.style.overflow = 'auto';
    currentArticleIndex = null;
}

// ====================
// LIKES SYSTEM (REAL-TIME FOR EVERYONE)
// ====================

function addLike() {
    if(currentArticleIndex === null) return;
    
    const article = articles[currentArticleIndex];
    const userId = getUserId();
    
    database.ref('articleReactions/' + article.id + '/' + userId).once('value')
        .then((snapshot) => {
            const currentReaction = snapshot.val();
            
            if (currentReaction === 'like') {
                // Remove like
                database.ref('articleReactions/' + article.id + '/' + userId).remove();
                const newLikes = Math.max(0, (article.likes || 1) - 1);
                
                database.ref('articles/' + article.id + '/likes').set(newLikes)
                    .then(() => {
                        showAlert("Usunięto polubienie", "info");
                    });
            } else {
                // Add like
                database.ref('articleReactions/' + article.id + '/' + userId).set('like');
                const newLikes = (article.likes || 0) + 1;
                
                // Remove dislike if exists
                if (currentReaction === 'dislike') {
                    const newDislikes = Math.max(0, (article.dislikes || 1) - 1);
                    database.ref('articles/' + article.id + '/dislikes').set(newDislikes);
                }
                
                database.ref('articles/' + article.id + '/likes').set(newLikes)
                    .then(() => {
                        showAlert("Polubiłeś ten artykuł!", "success");
                    });
            }
        })
        .catch((error) => {
            console.error("Firebase error:", error);
            showAlert("Błąd podczas aktualizacji reakcji", "error");
        });
}

function addDislike() {
    if(currentArticleIndex === null) return;
    
    const article = articles[currentArticleIndex];
    const userId = getUserId();
    
    database.ref('articleReactions/' + article.id + '/' + userId).once('value')
        .then((snapshot) => {
            const currentReaction = snapshot.val();
            
            if (currentReaction === 'dislike') {
                // Remove dislike
                database.ref('articleReactions/' + article.id + '/' + userId).remove();
                const newDislikes = Math.max(0, (article.dislikes || 1) - 1);
                
                database.ref('articles/' + article.id + '/dislikes').set(newDislikes)
                    .then(() => {
                        showAlert("Usunięto niepolubienie", "info");
                    });
            } else {
                // Add dislike
                database.ref('articleReactions/' + article.id + '/' + userId).set('dislike');
                const newDislikes = (article.dislikes || 0) + 1;
                
                // Remove like if exists
                if (currentReaction === 'like') {
                    const newLikes = Math.max(0, (article.likes || 1) - 1);
                    database.ref('articles/' + article.id + '/likes').set(newLikes);
                }
                
                database.ref('articles/' + article.id + '/dislikes').set(newDislikes)
                    .then(() => {
                        showAlert("Nie spodobał Ci się ten artykuł", "info");
                    });
            }
        })
        .catch((error) => {
            console.error("Firebase error:", error);
            showAlert("Błąd podczas aktualizacji reakcji", "error");
        });
}

function getUserId() {
    let userId = localStorage.getItem('k007_user_id');
    if(!userId) {
        userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('k007_user_id', userId);
    }
    return userId;
}

function updateReactionUI() {
    if(currentArticleIndex === null) return;
    
    const article = articles[currentArticleIndex];
    const userId = getUserId();
    
    database.ref('articleReactions/' + article.id + '/' + userId).once('value')
        .then((snapshot) => {
            const userReaction = snapshot.val();
            
            // Update counters
            document.getElementById('like-count').innerText = article.likes || 0;
            document.getElementById('dislike-count').innerText = article.dislikes || 0;
            
            // Update button states
            const likeBtn = document.querySelector('.like-btn');
            const dislikeBtn = document.querySelector('.dislike-btn');
            
            if(likeBtn && dislikeBtn) {
                likeBtn.classList.remove('active');
                dislikeBtn.classList.remove('active');
                
                if(userReaction === 'like') {
                    likeBtn.classList.add('active');
                } else if(userReaction === 'dislike') {
                    dislikeBtn.classList.add('active');
                }
            }
        })
        .catch((error) => {
            console.error("Firebase error:", error);
        });
}

// ====================
// COMMENTS SYSTEM (REAL-TIME)
// ====================

function postComment() {
    if(currentArticleIndex === null) return;
    
    const article = articles[currentArticleIndex];
    const nick = document.getElementById('comment-nick').value.trim();
    const text = document.getElementById('comment-text').value.trim();
    
    if(!nick || !text) {
        return showAlert("Wpisz nick i treść komentarza!", "warning");
    }
    
    if(text.length > 500) {
        return showAlert("Komentarz jest za długi (max 500 znaków)!", "warning");
    }
    
    const commentId = 'comment_' + Date.now();
    const newComment = {
        id: commentId,
        nick: nick,
        text: text,
        date: new Date().toLocaleString('pl-PL'),
        likes: 0,
        likedBy: {}
    };
    
    database.ref('articles/' + article.id + '/comments/' + commentId).set(newComment)
        .then(() => {
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
    
    if(!list) return;
    
    const comments = article.comments || {};
    const commentsArray = Object.values(comments);
    const sortedComments = commentsArray.sort((a, b) => b.id.localeCompare(a.id));
    
    list.innerHTML = sortedComments.map(comment => {
        const likedBy = comment.likedBy || {};
        const isLiked = likedBy[getUserId()] === true;
        
        return `
        <div class="comment-item">
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
                <button class="like-comment-btn ${isLiked ? 'liked' : ''}" onclick="likeComment('${comment.id}')">
                    <i class="fas fa-thumbs-up"></i> 
                    <span class="comment-like-count">${comment.likes || 0}</span>
                </button>
            </div>
        </div>
        `;
    }).join('');
    
    // Update comment count
    const commentsCount = document.getElementById('comments-count');
    if(commentsCount) {
        commentsCount.innerText = commentsArray.length;
    }
}

function likeComment(commentId) {
    if(currentArticleIndex === null) return;
    
    const article = articles[currentArticleIndex];
    const userId = getUserId();
    const commentRef = database.ref('articles/' + article.id + '/comments/' + commentId);
    
    commentRef.once('value')
        .then((snapshot) => {
            const comment = snapshot.val();
            if (!comment) return;
            
            const likedBy = comment.likedBy || {};
            const isLiked = likedBy[userId] === true;
            
            if(isLiked) {
                // Remove like
                delete likedBy[userId];
                const newLikes = Math.max(0, (comment.likes || 1) - 1);
                
                return commentRef.update({
                    likes: newLikes,
                    likedBy: likedBy
                });
            } else {
                // Add like
                likedBy[userId] = true;
                const newLikes = (comment.likes || 0) + 1;
                
                return commentRef.update({
                    likes: newLikes,
                    likedBy: likedBy
                });
            }
        })
        .then(() => {
            renderComments();
        })
        .catch((error) => {
            console.error("Firebase error:", error);
            showAlert("Błąd podczas polubienia komentarza", "error");
        });
}

// ====================
// ADMIN PANEL
// ====================

function renderAdminTools() {
    // Journalists list
    const agentsList = document.getElementById('active-agents-list');
    if(agentsList) {
        agentsList.innerHTML = allowedIDs.map(id => {
            const passInfo = journalistPasses[id] ? `Hasło: ${journalistPasses[id].password}` : 'Brak hasła';
            return `
            <li class="admin-art-item">
                <span><strong>${id}</strong><br><small>${passInfo}</small></span>
                <div>
                    <button class="btn-delete" onclick="removeAgent('${id}')">
                        <i class="fas fa-trash"></i> Usuń
                    </button>
                </div>
            </li>
            `;
        }).join('');
    }
    
    // Articles list for deletion
    const articlesList = document.getElementById('admin-articles-list');
    if(articlesList) {
        articlesList.innerHTML = articles.slice(0, 15).map(article => {
            const safeId = article.id.replace(/'/g, "\\'");
            return `
            <div class="admin-art-item">
                <span title="${article.title}">${article.title.substring(0, 40)}${article.title.length > 40 ? '...' : ''}</span>
                <button class="btn-delete" onclick="deleteArticle('${safeId}')">
                    <i class="fas fa-trash"></i> Usuń
                </button>
            </div>
            `;
        }).join('');
    }
    
    // Polls list for deletion
    const pollsList = document.getElementById('admin-polls-list');
    if(pollsList) {
        pollsList.innerHTML = polls.slice(0, 15).map(poll => {
            const safeId = poll.id.replace(/'/g, "\\'");
            return `
            <div class="admin-art-item">
                <span title="${poll.title}">${poll.title.substring(0, 40)}${poll.title.length > 40 ? '...' : ''}</span>
                <button class="btn-delete" onclick="deletePoll('${safeId}')">
                    <i class="fas fa-trash"></i> Usuń
                </button>
            </div>
            `;
        }).join('');
    }
    
    updateStatistics();
}

function addAgent() {
    const newIdInput = document.getElementById('new-agent-id');
    if(!newIdInput) return;
    
    const newId = newIdInput.value.toUpperCase().trim();
    
    if(!newId) {
        return showAlert("Wpisz ID dziennikarza!", "warning");
    }
    
    // Check if ID already exists
    if(allowedIDs.includes(newId)) {
        return showAlert("Ten ID już istnieje!", "warning");
    }
    
    const newPass = prompt("Ustaw hasło dla dziennikarza " + newId + ":");
    if (!newPass || newPass.length < 3) {
        return showAlert("Hasło musi mieć co najmniej 3 znaki!", "warning");
    }
    
    // Add to Firebase
    database.ref('journalists/' + newId).set({
        password: newPass,
        created: new Date().toISOString(),
        createdBy: currentUser ? currentUser.id : 'ADMIN'
    })
    .then(() => {
        newIdInput.value = '';
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
    if(!articleId) return;
    
    if(confirm("Czy na pewno usunąć ten artykuł? Tej operacji nie można cofnąć.")) {
        // Remove article
        database.ref('articles/' + articleId).remove()
            .then(() => {
                // Remove reactions
                database.ref('articleReactions/' + articleId).remove();
                showAlert("Artykuł został usunięty", "success");
            })
            .catch((error) => {
                console.error("Firebase error:", error);
                showAlert("Błąd podczas usuwania artykułu", "error");
            });
    }
}

function deletePoll(pollId) {
    if(!pollId) return;
    
    if(confirm("Czy na pewno usunąć ten sondaż?")) {
        database.ref('polls/' + pollId).remove()
            .then(() => {
                showAlert("Sondaż został usunięty", "success");
            })
            .catch((error) => {
                console.error("Firebase error:", error);
                showAlert("Błąd podczas usuwania sondażu", "error");
            });
    }
}

// ====================
// JOURNALIST DASHBOARD
// ====================

function renderJournalistDashboard() {
    if(!currentUser) return;
    
    const myArticles = articles.filter(article => article.publishedBy === currentUser.id);
    const container = document.getElementById('my-articles-list');
    
    if(!container) return;
    
    container.innerHTML = myArticles.slice(0, 10).map(article => `
        <div class="my-article-item">
            <div class="my-article-info">
                <h4>${article.title.substring(0, 60)}${article.title.length > 60 ? '...' : ''}</h4>
                <span>${article.displayDate || article.date}</span>
            </div>
            <div class="my-article-stats">
                <span><i class="fas fa-thumbs-up"></i> ${article.likes || 0}</span>
                <span><i class="fas fa-thumbs-down"></i> ${article.dislikes || 0}</span>
                <span><i class="fas fa-comment"></i> ${article.comments ? Object.keys(article.comments).length : 0}</span>
                <span><i class="fas fa-eye"></i> ${article.views || 0}</span>
            </div>
        </div>
    `).join('');
}

function resetEditorForm() {
    document.getElementById('art-title').value = '';
    document.getElementById('art-content').value = '';
    document.getElementById('art-author').value = '';
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
    // Journalist article image
    const journalistFileInput = document.getElementById('art-file');
    if(journalistFileInput) {
        journalistFileInput.addEventListener('change', function() {
            const file = this.files[0];
            if(file) {
                if(file.size > 5 * 1024 * 1024) {
                    showAlert("Plik jest za duży (max 5MB)!", "error");
                    this.value = '';
                    return;
                }
                
                const reader = new FileReader();
                reader.onload = function(e) {
                    document.getElementById('file-preview').innerHTML = `
                        <img src="${e.target.result}" alt="Podgląd" style="max-width:100%; border-radius:10px;">
                    `;
                };
                reader.readAsDataURL(file);
            }
        });
    }
    
    // Admin article image
    const adminArtFile = document.getElementById('admin-art-file');
    if(adminArtFile) {
        adminArtFile.addEventListener('change', function() {
            const fileName = this.files[0] ? this.files[0].name : "Nie wybrano pliku";
            document.getElementById('admin-art-file-name').innerText = fileName;
        });
    }
    
    // Poll image
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

function clearAllData() {
    if(confirm("UWAGA! Czy na pewno chcesz wyczyścić WSZYSTKIE dane?")) {
        if(confirm("Potwierdź usunięcie WSZYSTKICH danych. Wszystkie artykuły, sondaże i ustawienia zostaną usunięte!")) {
            // Remove all data
            database.ref('articles').remove();
            database.ref('polls').remove();
            database.ref('articleReactions').remove();
            
            // Keep only default journalist
            database.ref('journalists').set({
                DZIENNIKARZ001: {
                    password: 'haslo001',
                    created: new Date().toISOString(),
                    createdBy: 'SYSTEM'
                }
            });
            
            showAlert("Wszystkie dane zostały wyczyszczone", "warning");
        }
    }
}

// ====================
// SHARE & SAVE
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

document.addEventListener('keydown', function(event) {
    if(event.key === 'Escape') {
        closeArticle();
        closeGate();
        closePollModal();
    }
});
