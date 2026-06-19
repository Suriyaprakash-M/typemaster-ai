/* ============================================================
   TypeMaster AI — Core JavaScript
   Particles + Typing Engine + AI Coach + Gamification
   ============================================================ */

// ── Particle System ──────────────────────────────────────────
class ParticleSystem {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = [];
    this.mouse = { x: -9999, y: -9999 };
    this.resize();
    this.init();
    this.bindEvents();
    this.animate();
  }
  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }
  init() {
    const count = Math.min(80, Math.floor(window.innerWidth / 14));
    this.particles = [];
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        r: Math.random() * 1.8 + 0.4,
        alpha: Math.random() * 0.5 + 0.1,
        color: Math.random() > 0.5 ? '0,212,255' : '168,85,247'
      });
    }
  }
  bindEvents() {
    window.addEventListener('resize', () => { this.resize(); this.init(); });
    document.addEventListener('mousemove', e => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    });
  }
  animate() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    const W = this.canvas.width, H = this.canvas.height;
    for (const p of this.particles) {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = W;
      if (p.x > W) p.x = 0;
      if (p.y < 0) p.y = H;
      if (p.y > H) p.y = 0;
      // Mouse repel
      const dx = p.x - this.mouse.x, dy = p.y - this.mouse.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      if (dist < 120) {
        const force = (120 - dist) / 120 * 0.8;
        p.vx += dx / dist * force * 0.05;
        p.vy += dy / dist * force * 0.05;
      }
      // Speed clamp
      const speed = Math.sqrt(p.vx*p.vx + p.vy*p.vy);
      if (speed > 1.2) { p.vx *= 0.95; p.vy *= 0.95; }
      // Draw
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
      this.ctx.fillStyle = `rgba(${p.color},${p.alpha})`;
      this.ctx.fill();
    }
    // Lines
    for (let i = 0; i < this.particles.length; i++) {
      for (let j = i+1; j < this.particles.length; j++) {
        const a = this.particles[i], b = this.particles[j];
        const dx = a.x-b.x, dy = a.y-b.y;
        const d = Math.sqrt(dx*dx+dy*dy);
        if (d < 100) {
          this.ctx.beginPath();
          this.ctx.moveTo(a.x, a.y);
          this.ctx.lineTo(b.x, b.y);
          this.ctx.strokeStyle = `rgba(0,212,255,${(1 - d/100)*0.08})`;
          this.ctx.lineWidth = 0.5;
          this.ctx.stroke();
        }
      }
    }
    requestAnimationFrame(() => this.animate());
  }
}

// ── Typing Engine ────────────────────────────────────────────
class TypingEngine {
  constructor(opts = {}) {
    this.display   = opts.display;
    this.input     = opts.input;
    this.wpmEl     = opts.wpmEl;
    this.accEl     = opts.accEl;
    this.timerEl   = opts.timerEl;
    this.onFinish  = opts.onFinish || (() => {});

    this.text      = '';
    this.typed     = '';
    this.errors    = 0;
    this.startTime = null;
    this.timer     = null;
    this.duration  = opts.duration || 60;
    this.timeLeft  = this.duration;
    this.running   = false;
    this.finished  = false;
    this.mistakeMap = {}; // char → error count for AI analysis
  }

  load(text) {
    this.text = text;
    this.typed = '';
    this.errors = 0;
    this.startTime = null;
    this.timeLeft = this.duration;
    this.running = false;
    this.finished = false;
    this.mistakeMap = {};
    clearInterval(this.timer);
    this.render();
    if (this.timerEl) this.timerEl.textContent = this.timeLeft;
    if (this.wpmEl)  this.wpmEl.textContent  = '0';
    if (this.accEl)  this.accEl.textContent  = '100%';
    if (this.input) {
      this.input.value = '';
      this.input.addEventListener('input', e => this.handleInput(e));
      if (this.display)
        this.display.addEventListener('click', () => this.input.focus());
    }
  }

  handleInput(e) {
    if (this.finished) return;
    const val = e.target.value;
    if (!this.running && val.length === 1) this.start();
    this.typed = val;
    this.render();
    this.updateStats();
    if (this.typed.length >= this.text.length) this.finish();
  }

  start() {
    this.running = true;
    this.startTime = Date.now();
    this.timer = setInterval(() => {
      this.timeLeft--;
      if (this.timerEl) this.timerEl.textContent = this.timeLeft;
      this.updateStats();
      if (this.timeLeft <= 0) this.finish();
    }, 1000);
  }

  finish() {
    if (this.finished) return;
    this.finished = true;
    this.running = false;
    clearInterval(this.timer);
    const stats = this.getStats();
    this.onFinish(stats);
  }

  getStats() {
    const elapsed = this.startTime ? (Date.now() - this.startTime)/1000 : 1;
    const wordsTyped = this.typed.trim().split(/\s+/).length;
    const wpm = Math.round(wordsTyped / (elapsed/60));
    let correct = 0;
    for (let i = 0; i < this.typed.length; i++) {
      if (this.typed[i] === this.text[i]) correct++;
    }
    const acc = this.typed.length > 0 ? Math.round(correct/this.typed.length*100) : 100;
    return { wpm, acc, errors: this.typed.length - correct, elapsed, mistakeMap: this.mistakeMap };
  }

  updateStats() {
    const s = this.getStats();
    if (this.wpmEl) this.wpmEl.textContent  = s.wpm;
    if (this.accEl) this.accEl.textContent  = s.acc + '%';
  }

  render() {
    if (!this.display) return;
    let html = '';
    for (let i = 0; i < this.text.length; i++) {
      const ch = this.text[i] === ' ' ? '&nbsp;' : this.text[i];
      if (i < this.typed.length) {
        if (this.typed[i] === this.text[i]) {
          html += `<span class="char correct">${ch}</span>`;
        } else {
          html += `<span class="char wrong">${ch}</span>`;
          if (!this.mistakeMap[this.text[i]]) this.mistakeMap[this.text[i]] = 0;
          // Only count unique positions
        }
      } else if (i === this.typed.length) {
        html += `<span class="char current">${ch}</span>`;
      } else {
        html += `<span class="char">${ch}</span>`;
      }
    }
    this.display.innerHTML = html;
    // Auto scroll
    const cur = this.display.querySelector('.char.current');
    if (cur) cur.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
}

// ── AI Coach ─────────────────────────────────────────────────
const AICoach = {
  analyze(stats) {
    const tips = [];
    if (stats.wpm < 40)  tips.push({ icon:'🎯', msg:'Focus on accuracy over speed. Slow down and let muscle memory form.' });
    if (stats.wpm >= 40 && stats.wpm < 70)  tips.push({ icon:'⚡', msg:'You\'re progressing well! Try burst training — type fast for 10 seconds, then rest.' });
    if (stats.wpm >= 70) tips.push({ icon:'🚀', msg:'Excellent pace! Work on maintaining >98% accuracy at this speed.' });
    if (stats.acc < 90)  tips.push({ icon:'⌨️', msg:'Too many errors. Practice the "slow is smooth, smooth is fast" technique.' });
    if (stats.acc >= 95) tips.push({ icon:'✅', msg:'Great accuracy! Try increasing your target WPM by 5-10%.' });
    const mistakes = Object.keys(stats.mistakeMap || {});
    if (mistakes.length > 0) {
      tips.push({ icon:'📍', msg:`Common error patterns on: "${mistakes.join(', ')}". Isolate and drill those characters.` });
    }
    tips.push({ icon:'📅', msg:'Consistency beats intensity. 15 minutes daily outperforms 2 hours weekly.' });
    return tips;
  },
  getQuote() {
    const quotes = [
      { q: "Speed is a byproduct of mastery.", a: "Anonymous" },
      { q: "The expert has failed more times than the beginner has tried.", a: "Stephen McCranie" },
      { q: "Every keystroke builds the bridge to fluency.", a: "TypeMaster AI" },
      { q: "Your fingers remember what your mind forgets.", a: "Typing Wisdom" },
    ];
    return quotes[Math.floor(Math.random() * quotes.length)];
  }
};

// ── Gamification ─────────────────────────────────────────────
const GameSystem = {
  data: {
    xp: 0, level: 1, coins: 0, streak: 0,
    badges: [], missions: [], totalTests: 0,
    bestWpm: 0, todayXp: 0
  },
  load() {
    const saved = localStorage.getItem('tm_game');
    if (saved) this.data = { ...this.data, ...JSON.parse(saved) };
  },
  save() {
    localStorage.setItem('tm_game', JSON.stringify(this.data));
  },
  addXp(amount) {
    this.data.xp += amount;
    this.data.todayXp += amount;
    const xpPerLevel = 500;
    const newLevel = Math.floor(this.data.xp / xpPerLevel) + 1;
    if (newLevel > this.data.level) {
      this.data.level = newLevel;
      this.showLevelUp(newLevel);
    }
    this.save();
    this.updateUI();
  },
  addCoins(amount) {
    this.data.coins += amount;
    this.save();
    this.updateUI();
  },
  recordTest(stats) {
    this.data.totalTests++;
    if (stats.wpm > this.data.bestWpm) this.data.bestWpm = stats.wpm;
    // XP calculation
    const xp = Math.floor(stats.wpm * (stats.acc/100) * 0.5) + 10;
    const coins = Math.floor(xp / 5);
    this.addXp(xp);
    this.addCoins(coins);
    this.checkBadges(stats);
    this.save();
    return { xp, coins };
  },
  checkBadges(stats) {
    const checks = [
      { id:'speed_50', icon:'⚡', name:'Speed Demon', condition: stats.wpm >= 50 },
      { id:'speed_100', icon:'🚀', name:'Century Club', condition: stats.wpm >= 100 },
      { id:'perfect', icon:'💎', name:'Perfectionist', condition: stats.acc === 100 },
      { id:'tests_10', icon:'🎯', name:'Dedicated', condition: this.data.totalTests >= 10 },
    ];
    for (const c of checks) {
      if (c.condition && !this.data.badges.find(b => b.id === c.id)) {
        this.data.badges.push(c);
        this.showBadge(c);
      }
    }
  },
  getXpPercent() {
    const xpPerLevel = 500;
    return ((this.data.xp % xpPerLevel) / xpPerLevel) * 100;
  },
  showLevelUp(level) {
    showToast(`🎉 Level Up! You're now Level ${level}!`, 'gold');
  },
  showBadge(badge) {
    showToast(`${badge.icon} Badge Unlocked: ${badge.name}!`, 'purple');
  },
  updateUI() {
    const els = {
      xp:     document.querySelectorAll('[data-gm="xp"]'),
      level:  document.querySelectorAll('[data-gm="level"]'),
      coins:  document.querySelectorAll('[data-gm="coins"]'),
      streak: document.querySelectorAll('[data-gm="streak"]'),
    };
    for (const [k,v] of Object.entries(els)) {
      v.forEach(el => el.textContent = this.data[k]);
    }
    document.querySelectorAll('[data-gm="xp-bar"]').forEach(el => {
      el.style.width = this.getXpPercent() + '%';
    });
  }
};

// ── Toast Notifications ───────────────────────────────────────
function showToast(msg, type = 'blue') {
  const colors = {
    blue:   'rgba(0,212,255,0.15)',
    purple: 'rgba(168,85,247,0.15)',
    gold:   'rgba(255,215,0,0.15)',
    green:  'rgba(57,255,20,0.1)'
  };
  const borders = {
    blue: '#00d4ff', purple: '#a855f7', gold: '#ffd700', green: '#39ff14'
  };
  const toast = document.createElement('div');
  toast.style.cssText = `
    position:fixed; bottom:24px; right:24px; z-index:9999;
    padding:16px 24px;
    background:${colors[type] || colors.blue};
    border:1px solid ${borders[type] || borders.blue};
    border-radius:14px;
    backdrop-filter:blur(20px);
    font-family:'Space Grotesk',sans-serif;
    font-size:0.92rem;
    font-weight:600;
    color:#fff;
    box-shadow:0 8px 32px rgba(0,0,0,0.4);
    animation:fadeInUp 0.4s cubic-bezier(0.23,1,0.32,1) both;
    max-width:320px;
  `;
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'fadeIn 0.3s ease reverse both';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ── Scroll animations ─────────────────────────────────────────
function initScrollReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.reveal').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(32px)';
    el.style.transition = 'opacity 0.7s cubic-bezier(0.23,1,0.32,1), transform 0.7s cubic-bezier(0.23,1,0.32,1)';
    observer.observe(el);
  });
}

// ── Nav scroll effect ─────────────────────────────────────────
function initNav() {
  const nav = document.querySelector('.nav');
  if (!nav) return;
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 20);
  });
  // Mobile menu
  const menuBtn = document.querySelector('.nav-menu-btn');
  const navLinks = document.querySelector('.nav-links-wrap');
  if (menuBtn && navLinks) {
    menuBtn.addEventListener('click', () => {
      navLinks.classList.toggle('open');
    });
  }
}

// ── Animated counter ─────────────────────────────────────────
function animateCounter(el, target, duration = 1500) {
  const start = parseInt(el.textContent) || 0;
  const startTime = Date.now();
  const tick = () => {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(start + (target - start) * eased).toLocaleString();
    if (progress < 1) requestAnimationFrame(tick);
  };
  tick();
}

function initCounters() {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const target = parseInt(el.dataset.target || el.textContent.replace(/,/g,''));
        animateCounter(el, target);
        observer.unobserve(el);
      }
    });
  }, { threshold: 0.5 });
  document.querySelectorAll('.counter').forEach(el => observer.observe(el));
}

// ── Tab system ────────────────────────────────────────────────
function initTabs(container) {
  const tabs  = container.querySelectorAll('.mode-tab');
  const panes = container.querySelectorAll('.tab-pane');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      panes.forEach(p => p.style.display = 'none');
      tab.classList.add('active');
      const target = container.querySelector('#' + tab.dataset.tab);
      if (target) target.style.display = 'block';
    });
  });
  if (tabs[0]) tabs[0].click();
}

// ── Sample texts ─────────────────────────────────────────────
const TEXTS = {
  standard: [
    "The quick brown fox jumps over the lazy dog near the riverbank while the sun sets behind the mountains casting long golden shadows across the valley floor.",
    "Technology continues to reshape the way we communicate work and interact with the world around us bringing both unprecedented opportunities and complex challenges.",
    "Success is not the key to happiness. Happiness is the key to success. If you love what you are doing you will be successful in everything you pursue.",
  ],
  code_python: [
    `def binary_search(arr, target):\n    left, right = 0, len(arr) - 1\n    while left <= right:\n        mid = (left + right) // 2\n        if arr[mid] == target:\n            return mid\n        elif arr[mid] < target:\n            left = mid + 1\n        else:\n            right = mid - 1\n    return -1`,
    `class Node:\n    def __init__(self, data):\n        self.data = data\n        self.next = None\n\nclass LinkedList:\n    def __init__(self):\n        self.head = None\n\n    def append(self, data):\n        new_node = Node(data)\n        if not self.head:\n            self.head = new_node\n            return`,
  ],
  code_java: [
    `public class BubbleSort {\n    public static void sort(int[] arr) {\n        int n = arr.length;\n        for (int i = 0; i < n - 1; i++) {\n            for (int j = 0; j < n - i - 1; j++) {\n                if (arr[j] > arr[j + 1]) {\n                    int temp = arr[j];\n                    arr[j] = arr[j + 1];\n                    arr[j + 1] = temp;\n                }\n            }\n        }\n    }\n}`,
  ],
  code_sql: [
    `SELECT e.name, d.department_name, AVG(s.salary) as avg_salary\nFROM employees e\nINNER JOIN departments d ON e.department_id = d.id\nINNER JOIN salaries s ON e.id = s.employee_id\nWHERE s.year = 2024\nGROUP BY e.name, d.department_name\nHAVING AVG(s.salary) > 50000\nORDER BY avg_salary DESC;`,
  ],
  placement: [
    "Polymorphism is the ability of an object to take on many forms. The most common use of polymorphism in object-oriented programming occurs when a parent class reference is used to refer to a child class object.",
    "A binary search tree is a rooted binary tree data structure with the key of each internal node being greater than all the keys in the respective node left subtree and less than the ones in right subtree.",
  ],
  tamil: [
    "தமிழ் மொழி உலகின் மிகவும் பழமையான மொழிகளில் ஒன்றாகும். இது திராவிட மொழிக் குடும்பத்தைச் சேர்ந்தது.",
    "கல்வி என்பது ஒரு மனிதனை உயர்வான சிந்தனையாளனாக மாற்றும் சக்தி கொண்டது.",
  ]
};

// ── Live WPM Demo (hero) ──────────────────────────────────────
function initHeroDemo() {
  const wpmEl = document.getElementById('hero-wpm');
  if (!wpmEl) return;
  let wpm = 0;
  const target = 127;
  const tick = () => {
    wpm += Math.random() * 3;
    if (wpm >= target) { wpm = target; return; }
    wpmEl.textContent = Math.round(wpm);
    setTimeout(tick, 80);
  };
  setTimeout(tick, 800);
}

// ── Daily challenge countdown ─────────────────────────────────
function initChallengeClock() {
  const el = document.getElementById('challenge-timer');
  if (!el) return;
  const tick = () => {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24,0,0,0);
    const diff = midnight - now;
    const h = Math.floor(diff/3600000).toString().padStart(2,'0');
    const m = Math.floor((diff%3600000)/60000).toString().padStart(2,'0');
    const s = Math.floor((diff%60000)/1000).toString().padStart(2,'0');
    el.textContent = `${h}:${m}:${s}`;
  };
  tick();
  setInterval(tick, 1000);
}

// ── Init all ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Particles
  const canvas = document.getElementById('particles-canvas');
  if (canvas) new ParticleSystem(canvas);

  // Nav
  initNav();

  // Scroll reveal
  initScrollReveal();

  // Counters
  initCounters();

  // Hero demo
  initHeroDemo();

  // Challenge timer
  initChallengeClock();

  // Gamification
  GameSystem.load();
  GameSystem.updateUI();

  // Tab systems
  document.querySelectorAll('[data-tabs]').forEach(el => initTabs(el));

  // Active nav link
  const currentPage = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach(a => {
    if (a.getAttribute('href') === currentPage ||
        (currentPage === '' && a.getAttribute('href') === 'index.html')) {
      a.classList.add('active');
    }
  });
});

// Export for pages
window.TypeMaster = {
  TypingEngine,
  AICoach,
  GameSystem,
  TEXTS,
  showToast,
  animateCounter
};
