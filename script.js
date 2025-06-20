// script.js — Magic AI chat app with external JSON data, case/punctuation-insensitive matching

document.addEventListener('DOMContentLoaded', () => {
  // Utility: normalize text (lowercase, remove punctuation)
  function normalize(str) {
    return str
      .toLowerCase()
      .replace(/[\p{P}\p{S}]/gu, '')  // remove punctuation & symbols
      .trim();
  }

  // Animated background particles
  function createParticles() {
    const container = document.getElementById('particles');
    for (let i = 0; i < 50; i++) {
      const p = document.createElement('div');
      p.className = 'particle';
      p.style.left = Math.random() * 100 + '%';
      p.style.top = Math.random() * 100 + '%';
      const size = Math.random() * 4 + 2 + 'px';
      p.style.width = size;
      p.style.height = size;
      p.style.animationDelay = Math.random() * 6 + 's';
      container.appendChild(p);
    }
  }
  createParticles();

  // Fetch external Q&A data from data.json
  async function fetchExternalData() {
    try {
      const resp = await fetch('data.json', { cache: 'no-store' });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.error('Error loading data.json:', err);
      return [];
    }
  }

  // Main AI assistant class
  class AIAssistant {
    constructor() {
      this.searchMode = true;
      this.isTyping = false;
      this.knowledgeBase = {};
      this.init();
    }

    async init() {
      // 1. Load saved or default knowledgeBase
      const saved = localStorage.getItem('aiKnowledgeBase');
      if (saved) {
        this.knowledgeBase = JSON.parse(saved);
      } else {
        const defaults = {
          'hello': "Hello! I'm Magic AI… ✨",
          'how are you': "I'm functioning perfectly… 🪄",
          'what can you do': "I can search the web… ✨",
          'tell me a joke': "Why don’t scientists trust atoms?… 😄✨",
          'fastest animal': "The cheetah… 🐆",
          'largest planet': "Jupiter… 🪐",
          'deepest ocean': "The Mariana Trench… 🌊",
          'oldest programming language': "FORTRAN… 💻",
          'who created javascript': "Brendan Eich… ⚡",
          'what is ai': "AI refers… 🤖✨"
        };
        // normalize default keys
        for (let q in defaults) {
          this.knowledgeBase[ normalize(q) ] = defaults[q];
        }
      }

      // 2. Merge external data.json
      const external = await fetchExternalData();
      external.forEach(item => {
        if (item.question && item.answer) {
          this.knowledgeBase[ normalize(item.question) ] = item.answer;
        }
      });
      localStorage.setItem('aiKnowledgeBase', JSON.stringify(this.knowledgeBase));

      // 3. Setup UI
      this.initElements();
      this.bindEvents();
      this.updateModeUI();
      this.showWelcome();
    }

    initElements() {
      this.messagesContainer = document.getElementById('messages');
      this.userInput = document.getElementById('user-input');
      this.sendBtn = document.getElementById('send-btn');
      this.modeToggle = document.getElementById('mode-toggle');
      this.typingIndicator = document.getElementById('typing');
      this.inputContainer = document.getElementById('input-container');
      this.modalOverlay = document.getElementById('modal-overlay');
      this.questionsList = document.getElementById('questions-list');
      this.modalSearch = document.getElementById('modal-search');
    }

    bindEvents() {
      this.sendBtn.addEventListener('click', () => this.handleSend());
      this.userInput.addEventListener('keypress', e => { if (e.key === 'Enter') this.handleSend(); });
      this.modeToggle.addEventListener('click', () => this.toggleMode());
      document.getElementById('add-question').addEventListener('click', () => this.addKnowledge());
      document.getElementById('view-questions').addEventListener('click', () => this.toggleModal(true));
    document.getElementById('calculator').addEventListener('click', () => {
      window.location.href = 'index2.html';
    });
      document.getElementById('clear-chat').addEventListener('click', () => this.clearChat());
      document.getElementById('close-modal').addEventListener('click', () => this.toggleModal(false));
      this.modalOverlay.addEventListener('click', e => { if (e.target === this.modalOverlay) this.toggleModal(false); });
      this.modalSearch.addEventListener('input', e => this.renderQuestions(e.target.value));
    }

    showWelcome() {
      setTimeout(() => {
        this.addMessage('bot',
          `Welcome to Magic AI! 🪄✨\n\nI'm your magical assistant. Toggle modes to Chat or Search, ask questions, or add knowledge!`
        );
      }, 300);
    }

    toggleMode() {
      this.searchMode = !this.searchMode;
      this.updateModeUI();
    }

    updateModeUI() {
      if (this.searchMode) {
        this.modeToggle.textContent = '💬 Chat Mode';
        this.modeToggle.classList.add('search-active');
        this.inputContainer.classList.add('search-mode');
      } else {
        this.modeToggle.textContent = '🔍 Search Mode';
        this.modeToggle.classList.remove('search-active');
        this.inputContainer.classList.remove('search-mode');
      }
    }

    async handleSend() {
      const raw = this.userInput.value;
      if (!raw.trim() || this.isTyping) return;
      const text = normalize(raw);
      this.userInput.value = '';
      if (this.searchMode) {
        this.addMessage('search', `🔍 ${raw}`);
        await this.performWebSearch(raw);
      } else {
        this.addMessage('user', raw);
        await this.respond(text);
      }
    }

    async performWebSearch(query) {
      this.showTyping();
      try {
        const resp = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json`);
        const data = await resp.json();
        const output = data.Abstract || data.Definition || data.RelatedTopics?.[0]?.Text || data.Answer || `No result for "${query}".`;
        this.addMessage('bot', output);
      } catch (err) {
        this.addMessage('bot', `Search error: ${err.message}`);
      }
      this.hideTyping();
    }

    async respond(normText) {
      this.showTyping();
      let answer = this.knowledgeBase[normText];
      if (!answer) {
        // try substring match
        for (const key in this.knowledgeBase) {
          if (normText.includes(key)) { answer = this.knowledgeBase[key]; break; }
        }
      }
      if (!answer) answer = `I don't know "${normText}". Add it via Add Knowledge.`;
      this.addMessage('bot', answer);
      this.hideTyping();
    }

    addMessage(type, txt) {
      const el = document.createElement('div');
      el.className = `message ${type}`;
      el.textContent = txt;
      this.messagesContainer.appendChild(el);
      this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }

    showTyping() { this.isTyping = true; this.typingIndicator.style.display = 'flex'; }
    hideTyping() { this.isTyping = false; this.typingIndicator.style.display = 'none'; }

    addKnowledge() {
      const question = prompt('Question?'); if (!question) return;
      const answer = prompt('Answer?'); if (!answer) return;
      this.knowledgeBase[ normalize(question) ] = answer;
      localStorage.setItem('aiKnowledgeBase', JSON.stringify(this.knowledgeBase));
      alert('Knowledge added!');
    }

    toggleModal(show) {
      this.modalOverlay.style.display = show ? 'flex' : 'none';
      if (show) this.renderQuestions('');
    }

    renderQuestions(filterRaw) {
      const filter = normalize(filterRaw);
      this.questionsList.innerHTML = '';
      const list = Object.entries(this.knowledgeBase)
        .filter(([q]) => q.includes(filter));
      if (!list.length) {
        this.questionsList.innerHTML = `<p style="color:#999; text-align:center;">No entries.</p>`;
        return;
      }
      list.forEach(([q, a]) => {
        const item = document.createElement('div');
        item.className = 'question-item';
        item.innerHTML = `<div class="question">Q: ${q}</div><div class="answer">A: ${a}</div>`;
        this.questionsList.appendChild(item);
      });
    }

    clearChat() {
      if (confirm('Clear chat?')) {
        this.messagesContainer.innerHTML = '';
        this.showWelcome();
      }
    }
  }

  // Start the assistant
  new AIAssistant();
});
