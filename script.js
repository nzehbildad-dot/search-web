const searchForm = document.querySelector('#search-form');
const searchInput = document.querySelector('#search-input');
const statusMessage = document.querySelector('#status');
const answerSection = document.querySelector('#answer-section');
const answerHeading = document.querySelector('#answer-heading');
const answerText = document.querySelector('#answer-text');
const sourceLink = document.querySelector('#source-link');
const resultsSection = document.querySelector('#results-section');
const resultsList = document.querySelector('#results-list');
const resultCount = document.querySelector('#result-count');
const notFoundSection = document.querySelector('#not-found-section');
const tryAgainButton = document.querySelector('#try-again-button');
const topicButtons = document.querySelectorAll('.nav-inner button');
const resultsHeading = document.querySelector('#results-heading');

searchForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const query = searchInput.value.trim();
    if (!query) return;

    setLoadingState(true);
    try {
        const searchUrl = new URL('https://en.wikipedia.org/w/api.php');
        searchUrl.search = new URLSearchParams({
            action: 'query',
            list: 'search',
            srsearch: query,
            srlimit: '6',
            format: 'json',
            origin: '*'
        });
        const response = await fetch(searchUrl);
        if (!response.ok) throw new Error('The search service is unavailable.');
        const data = await response.json();
        const matches = data.query.search;
        if (!matches.length) {
            renderNotFound();
            return;
        }

        const answer = await getArticleSummary(matches[0].title);
        renderAnswer(answer, matches.length);
        renderResults(matches.slice(1), 'MORE TO EXPLORE');
        notFoundSection.hidden = true;
        statusMessage.textContent = '';
        answerSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) {
        answerSection.hidden = true;
        resultsSection.hidden = true;
        notFoundSection.hidden = true;
        statusMessage.textContent = error.message || 'Something went wrong. Please try again.';
        statusMessage.className = 'status error';
    } finally {
        setLoadingState(false);
    }
});

async function getArticleSummary(title) {
    const summaryUrl = new URL(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`);
    const response = await fetch(summaryUrl);
    if (!response.ok) throw new Error('The answer could not be loaded. Please try again.');
    return response.json();
}

function renderAnswer(article, count) {
    answerHeading.textContent = article.title;
    answerText.textContent = article.extract || 'A summary is not available for this article.';
    sourceLink.href = article.content_urls.desktop.page;
    sourceLink.hidden = false;
    resultCount.textContent = `${count} related results`;
    answerSection.hidden = false;
}

function renderNotFound() {
    answerSection.hidden = true;
    resultsSection.hidden = true;
    notFoundSection.hidden = false;
    statusMessage.textContent = '';
    notFoundSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderResults(matches, heading) {
    resultsHeading.textContent = heading;
    resultsList.innerHTML = matches.map((match) => `
        <article class="result-item">
            <h3>${escapeHtml(match.title)}</h3>
            <p>${stripHtml(match.snippet)}...</p>
            <a href="https://en.wikipedia.org/wiki/${encodeURIComponent(match.title.replaceAll(' ', '_'))}" target="_blank" rel="noreferrer">Read more <span aria-hidden="true">&#8594;</span></a>
        </article>
    `).join('');
    resultsSection.hidden = matches.length === 0;
}

async function loadTopic(topic, button) {
    setLoadingState(true);
    topicButtons.forEach((item) => item.classList.remove('active-section'));
    button.classList.add('active-section');
    try {
        const searchUrl = new URL('https://en.wikipedia.org/w/api.php');
        searchUrl.search = new URLSearchParams({
            action: 'query', list: 'search', srsearch: topic, srlimit: '6', format: 'json', origin: '*'
        });
        const response = await fetch(searchUrl);
        if (!response.ok) throw new Error('The topic feed is unavailable.');
        const data = await response.json();
        const matches = data.query.search;
        if (!matches.length) {
            renderNotFound();
            return;
        }
        answerSection.hidden = true;
        notFoundSection.hidden = true;
        renderResults(matches, `${button.textContent.toUpperCase()} ARTICLES`);
        statusMessage.textContent = '';
        resultsSection.hidden = false;
        resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) {
        statusMessage.textContent = error.message || 'The topic feed could not be loaded.';
        statusMessage.className = 'status error';
    } finally {
        setLoadingState(false);
    }
}

function setLoadingState(isLoading) {
    const button = searchForm.querySelector('button');
    button.disabled = isLoading;
    button.textContent = isLoading ? 'Searching...' : 'Search →';
    statusMessage.className = 'status';
    statusMessage.textContent = isLoading ? 'Searching the encyclopedia...' : '';
}

tryAgainButton.addEventListener('click', () => {
    searchInput.focus();
    searchInput.select();
});

topicButtons.forEach((button) => {
    button.addEventListener('click', () => {
        if (button.dataset.topic) loadTopic(button.dataset.topic, button);
    });
});

function stripHtml(value) {
    const element = document.createElement('div');
    element.innerHTML = value;
    return element.textContent || '';
}

function escapeHtml(value) {
    return value.replace(/[&<>'"]/g, (character) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[character]));
}

