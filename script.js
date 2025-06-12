// OMDB API Configuration
const API_KEY = '1b913320';
const BASE_URL = 'http://www.omdbapi.com/';

// DOM Elements
const movieSearch = document.getElementById('movieSearch');
const searchBtn = document.getElementById('searchBtn');
const loadingSpinner = document.getElementById('loadingSpinner');
const errorMessage = document.getElementById('errorMessage');
const movieDetails = document.getElementById('movieDetails');
const initialMessage = document.getElementById('initialMessage');
const latestMoviesCarousel = document.getElementById('latestMoviesCarousel');
const latestPrevBtn = document.getElementById('latestPrevBtn');
const latestNextBtn = document.getElementById('latestNextBtn');
const genreRecommendationsSection = document.getElementById('genreRecommendationsSection');

// State Management
let currentSearchQuery = '';
let latestMovies = [];
let genreMovies = {};

// Drag functionality state
let isDragging = false;
let startX = 0;
let scrollLeft = 0;
let currentCarousel = null;

// Popular movies for latest releases and recommendations
const popularMovies = [
    'The Dark Knight', 'Inception', 'Pulp Fiction', 'The Godfather', 'The Shawshank Redemption',
    'Forrest Gump', 'The Matrix', 'Goodfellas', 'The Silence of the Lambs', 'Schindler\'s List',
    'Interstellar', 'The Lord of the Rings: The Fellowship of the Ring', 'Fight Club', 'The Departed',
    'Gladiator', 'The Prestige', 'Se7en', 'The Green Mile', 'Saving Private Ryan', 'Terminator 2: Judgment Day'
];

const genreMovieMap = {
    'Action': [
        'Mad Max: Fury Road', 'John Wick', 'Die Hard', 'Mission: Impossible', 'Speed',
        'The Dark Knight', 'Terminator 2: Judgment Day', 'Heat', 'The Matrix', 'Casino Royale',
        'Gladiator', 'Top Gun', 'The Bourne Identity', 'Lethal Weapon', 'First Blood'
    ],
    'Comedy': [
        'The Grand Budapest Hotel', 'Superbad', 'Anchorman', 'The Hangover', 'Borat',
        'Dumb and Dumber', 'Groundhog Day', 'Coming to America', 'The Big Lebowski', 'Airplane!',
        'Ghostbusters', 'Zoolander', 'Wedding Crashers', 'Meet the Parents', 'Tropic Thunder'
    ],
    'Drama': [
        'The Godfather', 'The Shawshank Redemption', 'Schindler\'s List', 'Forrest Gump', 'The Green Mile',
        'Good Will Hunting', 'A Beautiful Mind', 'The Pursuit of Happyness', 'Dead Poets Society', 'Rain Man',
        'One Flew Over the Cuckoo\'s Nest', 'The Social Network', 'There Will Be Blood', 'Whiplash', 'Moonlight'
    ],
    'Horror': [
        'The Exorcist', 'Halloween', 'A Nightmare on Elm Street', 'The Shining', 'Get Out',
        'Hereditary', 'The Conjuring', 'It', 'Scream', 'The Texas Chain Saw Massacre',
        'Psycho', 'Poltergeist', 'The Ring', 'Alien', 'The Babadook'
    ],
    'Sci-Fi': [
        'Blade Runner', 'The Matrix', 'Interstellar', 'Inception', 'Star Wars',
        'Alien', 'The Terminator', 'Back to the Future', 'E.T. the Extra-Terrestrial', 'Close Encounters of the Third Kind',
        'Arrival', 'Ex Machina', 'The Fifth Element', 'Minority Report', 'Gravity'
    ],
    'Thriller': [
        'Se7en', 'The Silence of the Lambs', 'North by Northwest', 'Rear Window', 'Zodiac',
        'Gone Girl', 'The Sixth Sense', 'Shutter Island', 'No Country for Old Men', 'Vertigo',
        'Psycho', 'The Fugitive', 'Heat', 'Memento', 'The Usual Suspects'
    ]
};

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // Add event listeners
    searchBtn.addEventListener('click', handleSearch);
    movieSearch.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            handleSearch();
        }
    });

    // Logo home button functionality
    const logo = document.querySelector('.logo');
    logo.addEventListener('click', goHome);
    logo.style.cursor = 'pointer';

    // Carousel navigation event listeners with infinite scroll
    latestPrevBtn.addEventListener('click', () => scrollCarouselInfinite(latestMoviesCarousel, -250, 'prev'));
    latestNextBtn.addEventListener('click', () => scrollCarouselInfinite(latestMoviesCarousel, 250, 'next'));

    // Add sample search button listeners
    const sampleButtons = document.querySelectorAll('.sample-btn');
    sampleButtons.forEach(button => {
        button.addEventListener('click', function() {
            const searchTerm = this.getAttribute('data-search');
            movieSearch.value = searchTerm;
            handleSearch();
        });
    });

    // Load initial content
    loadLatestReleases();
    loadGenreRecommendations();

    // Focus on search input
    movieSearch.focus();
}

// Home button functionality
function goHome() {
    // Clear search input
    movieSearch.value = '';
    
    // Hide movie details and error messages
    hideAllSections();
    
    // Show initial message and recommendations
    initialMessage.classList.remove('hidden');
    document.getElementById('latestReleasesSection').style.display = 'block';
    genreRecommendationsSection.style.display = 'block';
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Draggable functionality for carousels
function makeDraggable(carousel) {
    let isDown = false;
    let startX;
    let scrollLeft;
    let velocity = 0;
    let lastX = 0;
    let lastTime = 0;
    let hasMoved = false;

    // Mouse events
    carousel.addEventListener('mousedown', (e) => {
        isDown = true;
        hasMoved = false;
        startX = e.pageX - carousel.offsetLeft;
        scrollLeft = carousel.scrollLeft;
        velocity = 0;
        lastX = e.pageX;
        lastTime = Date.now();
        carousel.style.cursor = 'grabbing';
        e.preventDefault();
    });

    carousel.addEventListener('mouseleave', () => {
        isDown = false;
        carousel.classList.remove('dragging');
        carousel.style.cursor = 'grab';
        if (hasMoved) {
            applyMomentum(carousel, velocity);
        }
    });

    carousel.addEventListener('mouseup', () => {
        isDown = false;
        carousel.classList.remove('dragging');
        carousel.style.cursor = 'grab';
        if (hasMoved) {
            applyMomentum(carousel, velocity);
        }
    });

    carousel.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        e.preventDefault();
        
        const x = e.pageX - carousel.offsetLeft;
        const walk = (x - startX) * 2;
        const currentScrollLeft = scrollLeft - walk;
        
        // Only start dragging if moved more than 5 pixels
        if (Math.abs(walk) > 5 && !hasMoved) {
            hasMoved = true;
            carousel.classList.add('dragging');
        }
        
        if (hasMoved) {
            carousel.scrollLeft = currentScrollLeft;
            
            // Calculate velocity for momentum
            const now = Date.now();
            const timeDelta = now - lastTime;
            const xDelta = e.pageX - lastX;
            velocity = xDelta / timeDelta;
            lastX = e.pageX;
            lastTime = now;
        }
    });

    // Touch events for mobile
    carousel.addEventListener('touchstart', (e) => {
        isDown = true;
        hasMoved = false;
        startX = e.touches[0].pageX - carousel.offsetLeft;
        scrollLeft = carousel.scrollLeft;
        velocity = 0;
        lastX = e.touches[0].pageX;
        lastTime = Date.now();
    });

    carousel.addEventListener('touchend', () => {
        isDown = false;
        carousel.classList.remove('dragging');
        if (hasMoved) {
            applyMomentum(carousel, velocity);
        }
    });

    carousel.addEventListener('touchmove', (e) => {
        if (!isDown) return;
        
        const x = e.touches[0].pageX - carousel.offsetLeft;
        const walk = (x - startX) * 2;
        
        // Only start dragging if moved more than 5 pixels
        if (Math.abs(walk) > 5 && !hasMoved) {
            hasMoved = true;
            carousel.classList.add('dragging');
            e.preventDefault();
        }
        
        if (hasMoved) {
            e.preventDefault();
            carousel.scrollLeft = scrollLeft - walk;
            
            // Calculate velocity for momentum
            const now = Date.now();
            const timeDelta = now - lastTime;
            const xDelta = e.touches[0].pageX - lastX;
            velocity = xDelta / timeDelta;
            lastX = e.touches[0].pageX;
            lastTime = now;
        }
    });

    // Set initial cursor style
    carousel.style.cursor = 'grab';
    
    // Prevent clicks on movie cards during/after dragging
    carousel.addEventListener('click', (e) => {
        if (hasMoved) {
            e.preventDefault();
            e.stopPropagation();
            hasMoved = false; // Reset for next interaction
        }
    }, true);
}

// Apply momentum scrolling
function applyMomentum(carousel, velocity) {
    if (Math.abs(velocity) < 0.1) return;
    
    velocity *= 0.95; // Friction
    carousel.scrollLeft -= velocity * 10;
    
    if (Math.abs(velocity) > 0.1) {
        requestAnimationFrame(() => applyMomentum(carousel, velocity));
    }
}

// Enhanced Carousel Navigation Functions with Infinite Scroll
function scrollCarousel(carousel, distance) {
    carousel.scrollBy({
        left: distance,
        behavior: 'smooth'
    });
}

function scrollCarouselInfinite(carousel, distance, direction) {
    const maxScrollLeft = carousel.scrollWidth - carousel.clientWidth;
    const currentScroll = carousel.scrollLeft;
    
    if (direction === 'next' && currentScroll >= maxScrollLeft - 10) {
        // If at the end, go back to start
        carousel.scrollTo({
            left: 0,
            behavior: 'smooth'
        });
    } else if (direction === 'prev' && currentScroll <= 10) {
        // If at the start, go to end
        carousel.scrollTo({
            left: maxScrollLeft,
            behavior: 'smooth'
        });
    } else {
        // Normal scroll
        carousel.scrollBy({
            left: distance,
            behavior: 'smooth'
        });
    }
}

// Load Latest Releases
async function loadLatestReleases() {
    const shuffledMovies = shuffleArray([...popularMovies]).slice(0, 12);
    latestMovies = [];
    
    for (const movieTitle of shuffledMovies) {
        try {
            const movieData = await fetchMovieData(movieTitle);
            if (movieData && movieData.Response === 'True') {
                latestMovies.push(movieData);
            }
        } catch (error) {
            console.error(`Error fetching ${movieTitle}:`, error);
        }
    }
    
    displayLatestReleases();
}

// Load Genre Recommendations
async function loadGenreRecommendations() {
    const genresToLoad = ['Action', 'Comedy', 'Drama', 'Horror', 'Sci-Fi', 'Thriller'];
    
    for (const genre of genresToLoad) {
        const movies = genreMovieMap[genre] || [];
        genreMovies[genre] = [];
        
        for (const movieTitle of movies) {
            try {
                const movieData = await fetchMovieData(movieTitle);
                if (movieData && movieData.Response === 'True') {
                    genreMovies[genre].push(movieData);
                }
            } catch (error) {
                console.error(`Error fetching ${movieTitle}:`, error);
            }
        }
    }
    
    displayGenreRecommendations();
}

// Display Functions
function displayLatestReleases() {
    latestMoviesCarousel.innerHTML = latestMovies
        .map(movie => createMovieCard(movie))
        .join('');
    
    // Make the latest releases carousel draggable
    makeDraggable(latestMoviesCarousel);
}

function displayGenreRecommendations() {
    const genreHTML = Object.entries(genreMovies)
        .map(([genre, movies]) => createGenreSection(genre, movies))
        .join('');
    
    genreRecommendationsSection.innerHTML = genreHTML;
    
    // Make all genre carousels draggable
    Object.keys(genreMovies).forEach(genre => {
        const carousel = document.getElementById(`carousel-${genre}`);
        if (carousel) {
            makeDraggable(carousel);
        }
    });
}

function createMovieCard(movie) {
    const posterUrl = movie.Poster && movie.Poster !== 'N/A' 
        ? movie.Poster 
        : 'https://via.placeholder.com/220x300/141414/E50914?text=No+Poster';
    
    return `
        <div class="movie-card" onclick="searchAndDisplayMovie('${movie.Title.replace(/'/g, "\\'")}')">
            <div class="movie-card-poster">
                <img src="${posterUrl}" alt="${movie.Title}" loading="lazy">
            </div>
            <div class="movie-card-info">
                <div class="movie-card-title">${movie.Title}</div>
                <div class="movie-card-meta">
                    <span class="movie-card-year">${movie.Year}</span>
                    <span>${movie.Type.toUpperCase()}</span>
                </div>
            </div>
        </div>
    `;
}

function createGenreSection(genre, movies) {
    const genreIcons = {
        'Action': 'fas fa-fist-raised',
        'Comedy': 'fas fa-laugh',
        'Drama': 'fas fa-theater-masks',
        'Horror': 'fas fa-skull',
        'Sci-Fi': 'fas fa-rocket',
        'Thriller': 'fas fa-eye'
    };
    
    const icon = genreIcons[genre] || 'fas fa-film';
    
    return `
        <div class="genre-section" data-genre="${genre}">
            <h3 class="genre-title">
                <i class="${icon}"></i>
                ${genre}
            </h3>
            <div class="carousel-container">
                <button class="carousel-arrow carousel-arrow-left" onclick="scrollGenreCarouselInfinite('${genre}', -250, 'prev')">
                    <i class="fas fa-chevron-left"></i>
                </button>
                <div class="movie-carousel genre-carousel" id="carousel-${genre}">
                    ${movies.map(movie => createMovieCard(movie)).join('')}
                </div>
                <button class="carousel-arrow carousel-arrow-right" onclick="scrollGenreCarouselInfinite('${genre}', 250, 'next')">
                    <i class="fas fa-chevron-right"></i>
                </button>
            </div>
        </div>
    `;
}

function scrollGenreCarouselInfinite(genre, distance, direction) {
    const carousel = document.getElementById(`carousel-${genre}`);
    if (carousel) {
        scrollCarouselInfinite(carousel, distance, direction);
    }
}

// Movie Search and Display Functions
function searchAndDisplayMovie(title) {
    movieSearch.value = title;
    handleSearch();
}

function handleSearch() {
    const query = movieSearch.value.trim();
    
    if (!query) {
        showError('Please enter a title to search');
        return;
    }

    currentSearchQuery = query;
    searchMovie(query);
}

async function searchMovie(title) {
    showLoading();
    
    try {
        const data = await fetchMovieData(title);
        
        if (data && data.Response === 'True') {
            displayMovieDetails(data);
        } else {
            showError(data.Error || 'Sorry, we couldn\'t find that title. Try searching for something else.');
        }
    } catch (error) {
        console.error('Error fetching movie data:', error);
        showError('Something went wrong. Please check your connection and try again.');
    }
}

async function fetchMovieData(title) {
    const url = `${BASE_URL}?t=${encodeURIComponent(title)}&apikey=${API_KEY}&plot=full`;
    const response = await fetch(url);
    
    if (!response.ok) {
        throw new Error('Network response was not ok');
    }
    
    return await response.json();
}

function displayMovieDetails(movie) {
    // Hide all sections without showing recommendations
    loadingSpinner.classList.add('hidden');
    errorMessage.classList.add('hidden');
    movieDetails.classList.add('hidden');
    initialMessage.classList.add('hidden');
    
    // Hide recommendation sections immediately
    document.getElementById('latestReleasesSection').style.display = 'none';
    genreRecommendationsSection.style.display = 'none';
    
    const movieDetailsHTML = createMovieDetailsHTML(movie);
    movieDetails.innerHTML = movieDetailsHTML;
    movieDetails.classList.remove('hidden');
    
    // Scroll to top smoothly to show movie details
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function createMovieDetailsHTML(movie) {
    const posterUrl = movie.Poster && movie.Poster !== 'N/A' 
        ? movie.Poster 
        : 'https://via.placeholder.com/300x450/141414/E50914?text=No+Poster+Available';
    
    return `
        <div class="movie-header">
            <div class="movie-backdrop"></div>
            <div class="movie-header-content">
                <div class="movie-poster">
                    <img src="${posterUrl}" alt="${movie.Title} Poster" loading="lazy">
                </div>
                <div class="movie-info">
                    <h1 class="movie-title">${movie.Title}</h1>
                    <div class="movie-meta">
                        ${movie.Year !== 'N/A' ? `<span class="meta-item"><i class="fas fa-calendar"></i> ${movie.Year}</span>` : ''}
                        ${movie.Rated !== 'N/A' ? `<span class="meta-item"><i class="fas fa-certificate"></i> ${movie.Rated}</span>` : ''}
                        ${movie.Runtime !== 'N/A' ? `<span class="meta-item"><i class="fas fa-clock"></i> ${movie.Runtime}</span>` : ''}
                        ${movie.Type !== 'N/A' ? `<span class="meta-item"><i class="fas fa-tv"></i> ${movie.Type.toUpperCase()}</span>` : ''}
                    </div>
                    <div class="movie-plot">
                        <p>${movie.Plot !== 'N/A' ? movie.Plot : 'No plot summary available.'}</p>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="movie-body">
            <div class="info-grid">
                <div class="info-section">
                    <h3><i class="fas fa-user-tie"></i> Director</h3>
                    <p>${movie.Director !== 'N/A' ? movie.Director : 'Not available'}</p>
                </div>
                
                <div class="info-section">
                    <h3><i class="fas fa-pen"></i> Writers</h3>
                    <p>${movie.Writer !== 'N/A' ? movie.Writer : 'Not available'}</p>
                </div>
                
                <div class="info-section">
                    <h3><i class="fas fa-users"></i> Cast</h3>
                    <p>${movie.Actors !== 'N/A' ? movie.Actors : 'Not available'}</p>
                </div>
                
                <div class="info-section">
                    <h3><i class="fas fa-tags"></i> Genre</h3>
                    <p>${movie.Genre !== 'N/A' ? movie.Genre : 'Not available'}</p>
                </div>
                
                <div class="info-section">
                    <h3><i class="fas fa-globe"></i> Language</h3>
                    <p>${movie.Language !== 'N/A' ? movie.Language : 'Not available'}</p>
                </div>
                
                <div class="info-section">
                    <h3><i class="fas fa-flag"></i> Country</h3>
                    <p>${movie.Country !== 'N/A' ? movie.Country : 'Not available'}</p>
                </div>
                
                <div class="info-section">
                    <h3><i class="fas fa-trophy"></i> Awards</h3>
                    <p>${movie.Awards !== 'N/A' ? movie.Awards : 'No awards listed'}</p>
                </div>
                
                ${movie.BoxOffice && movie.BoxOffice !== 'N/A' ? `
                <div class="info-section">
                    <h3><i class="fas fa-dollar-sign"></i> Box Office</h3>
                    <p>${movie.BoxOffice}</p>
                </div>
                ` : ''}
                
                ${movie.Released && movie.Released !== 'N/A' ? `
                <div class="info-section">
                    <h3><i class="fas fa-calendar-alt"></i> Released</h3>
                    <p>${movie.Released}</p>
                </div>
                ` : ''}
            </div>
            
            ${createRatingsSection(movie)}
        </div>
    `;
}

function createRatingsSection(movie) {
    if (!movie.Ratings || movie.Ratings.length === 0) {
        return `
            <div class="ratings-container">
                <h3><i class="fas fa-star"></i> Ratings</h3>
                <p style="color: rgba(255, 255, 255, 0.6); text-align: center; padding: 2rem;">No ratings available</p>
            </div>
        `;
    }
    
    let ratingsHTML = `
        <div class="ratings-container">
            <h3><i class="fas fa-star"></i> Ratings & Reviews</h3>
            <div class="ratings-grid">
    `;
    
    movie.Ratings.forEach(rating => {
        const icon = getRatingIcon(rating.Source);
        ratingsHTML += `
            <div class="rating-item">
                <div class="rating-value">${rating.Value}</div>
                <div class="rating-source">
                    <i class="${icon}"></i>
                    ${rating.Source}
                </div>
            </div>
        `;
    });
    
    // Add IMDB rating if available and not already in ratings
    if (movie.imdbRating && movie.imdbRating !== 'N/A') {
        const hasImdbRating = movie.Ratings.some(rating => 
            rating.Source.toLowerCase().includes('imdb') || 
            rating.Source.toLowerCase().includes('internet movie database')
        );
        
        if (!hasImdbRating) {
            ratingsHTML += `
                <div class="rating-item">
                    <div class="rating-value">${movie.imdbRating}/10</div>
                    <div class="rating-source">
                        <i class="fab fa-imdb"></i>
                        IMDb
                    </div>
                </div>
            `;
        }
    }
    
    // Add Metascore if available
    if (movie.Metascore && movie.Metascore !== 'N/A') {
        ratingsHTML += `
            <div class="rating-item">
                <div class="rating-value">${movie.Metascore}/100</div>
                <div class="rating-source">
                    <i class="fas fa-chart-line"></i>
                    Metascore
                </div>
            </div>
        `;
    }
    
    ratingsHTML += `
            </div>
        </div>
    `;
    
    return ratingsHTML;
}

function getRatingIcon(source) {
    const sourceLower = source.toLowerCase();
    
    if (sourceLower.includes('imdb') || sourceLower.includes('internet movie database')) {
        return 'fab fa-imdb';
    } else if (sourceLower.includes('rotten tomatoes')) {
        return 'fas fa-pepper-hot';
    } else if (sourceLower.includes('metacritic')) {
        return 'fas fa-chart-line';
    } else {
        return 'fas fa-star';
    }
}

function showLoading() {
    hideAllSections();
    loadingSpinner.classList.remove('hidden');
}

function showError(message) {
    hideAllSections();
    errorMessage.querySelector('p').textContent = message;
    errorMessage.classList.remove('hidden');
}

function hideAllSections() {
    loadingSpinner.classList.add('hidden');
    errorMessage.classList.add('hidden');
    movieDetails.classList.add('hidden');
    initialMessage.classList.add('hidden');
    
    // Show recommendation sections when not displaying movie details
    document.getElementById('latestReleasesSection').style.display = 'block';
    genreRecommendationsSection.style.display = 'block';
}

// Add some visual feedback for search input - Netflix style
movieSearch.addEventListener('input', function() {
    const query = this.value.trim();
    const searchIcon = document.querySelector('.search-icon');
    
    if (query.length > 0) {
        searchIcon.style.color = '#E50914';
    } else {
        searchIcon.style.color = 'rgba(255, 255, 255, 0.6)';
    }
});

// Add keyboard shortcut for search (Ctrl/Cmd + K) - Netflix style
document.addEventListener('keydown', function(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        movieSearch.focus();
        movieSearch.select();
    }
});

// Add escape key to clear search and return to initial state
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        movieSearch.value = '';
        hideAllSections();
        initialMessage.classList.remove('hidden');
        movieSearch.focus();
    }
});

// Smooth scroll to results after search
function scrollToResults() {
    const resultsSection = document.querySelector('.results-section');
    if (resultsSection) {
        resultsSection.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
        });
    }
}

// Add Netflix-style hover effects
document.addEventListener('DOMContentLoaded', function() {
    // Add hover effect to search box
    const searchBox = document.querySelector('.search-box');
    if (searchBox) {
        searchBox.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-1px)';
        });
        
        searchBox.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
        });
    }
});

// Utility Functions
function shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
} 