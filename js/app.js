/* ============================================================
   LOGIC — biasanya tidak perlu diedit di bawah sini
   ============================================================ */
let current = null;
let pendingPerson = null;
let isOpening = false;
let typing = false;
let typeToken = 0;
let sigClicks = 0;
let sigResetTimer = null;

// ---------- HUB ----------
// Get opened letters from Firebase (returns a Promise)
function getOpened() {
  return db.ref('opened').once('value')
    .then(snapshot => {
      const data = snapshot.val() || {};
      return Object.keys(data);
    })
    .catch(err => {
      console.error("Error fetching opened letters:", err);
      return []; // Fallback to empty array on error
    });
}

async function renderHub() {
  const grid = document.getElementById("hubGrid");
  if (!grid) {
    console.error("hubGrid element not found!");
    return;
  }
  
  try {
    const opened = await getOpened();
    console.log("Rendering hub, opened letters:", opened); // Debug log
    
    grid.innerHTML = "";
    PEOPLE.forEach(p => {
      const isOpen = opened.includes(p.id);
      const item = document.createElement("div");
      item.className = "hub-item";
      item.innerHTML =
        '<div class="mini-env"><div class="mini-flap"></div>' +
        '<div class="mini-seal">' + (isOpen ? "💌" : p.name.charAt(0).toUpperCase()) + "</div></div>" +
        '<div class="mini-name">' + p.name + "</div>" +
        '<div class="mini-status' + (isOpen ? " opened" : "") + '">' + (isOpen ? "Sudah dibuka 💌" : "🔒 khusus " + p.name) + "</div>";
      item.onclick = () => openModal(p);

      item.addEventListener("mouseenter", () => {
        const sound = document.getElementById("letterHoverSound");
        if (sound) {
          sound.currentTime = 0;
          sound.volume = 0.25;
          sound.play().catch(() => {});
        }
      });

      grid.appendChild(item);
    });
  } catch (err) {
    console.error("Failed to render hub:", err);
    // Show error message in grid
    grid.innerHTML = '<div style="text-align:center;color:#ff527b;padding:20px;">Gagal memuat surat. Refresh halaman ya.</div>';
  }
}

// ---------- CODE MODAL ----------
function openModal(p) {
  pendingPerson = p;
  document.getElementById("modalName").innerText = "Halo, " + p.name + "! 🔒";
  document.getElementById("modalErr").innerText = "";
  document.getElementById("codeInput").value = "";
  document.getElementById("codeModal").classList.add("show");
  setTimeout(() => document.getElementById("codeInput").focus(), 100);
}

function closeModal() {
  document.getElementById("codeModal").classList.remove("show");
  pendingPerson = null;
}

function verifyCode() {
  const input = document.getElementById("codeInput");
  const val = input.value.trim().toUpperCase();
  if (pendingPerson && val === pendingPerson.code.toUpperCase()) {
    document.getElementById("codeModal").classList.remove("show");
    selectPerson(pendingPerson);
    pendingPerson = null;
  } else {
    document.getElementById("modalErr").innerText = "Kode salah 😅 coba lagi ya!";
    input.classList.add("shake");
    setTimeout(() => input.classList.remove("shake"), 450);
  }
}

document.getElementById("codeInput").addEventListener("keydown", e => {
  if (e.key === "Enter") verifyCode();
});

document.getElementById("codeModal").addEventListener("click", e => {
  if (e.target.id === "codeModal") closeModal();
});

// ---------- SELECT PERSON ----------
function selectPerson(p) {
  current = p;
  history.replaceState(null, "", "?p=" + p.id + "&key=" + encodeURIComponent(p.code));

  // apply accent
  document.getElementById("letterContainer").style.setProperty("--primary-dark", p.accent);
  document.getElementById("letterContainer").style.setProperty("--primary", p.accent);

  // envelope
  document.getElementById("sealInitial").innerText = p.name.charAt(0).toUpperCase();
  document.getElementById("previewTitle").innerText = "For " + p.name + " ❤️";

  // award
  document.getElementById("awardIcon").innerText = p.awardIcon;
  document.getElementById("awardTitle").innerText = p.awardTitle;
  document.getElementById("awardDesc").innerText = p.awardDesc;

  // letter
  document.getElementById("letterTitle").innerText = p.title;
  document.getElementById("letterBody").innerHTML = "";
  document.getElementById("secretMsg").classList.remove("show");
  document.getElementById("skipArea").style.display = "none";
  sigClicks = 0;

  // reset envelope animation state
  const env = document.getElementById("envelopeBox");
  env.classList.remove("open", "fade-out");
  env.style.display = "";
  document.getElementById("letterContainer").classList.remove("show");
  isOpening = false;

  document.getElementById("hubView").style.display = "none";
  document.getElementById("envelopeScreen").classList.add("show");
  window.scrollTo(0, 0);
}

function goBack() {
  history.replaceState(null, "", location.pathname);
  document.getElementById("envelopeScreen").classList.remove("show");
  document.getElementById("letterContainer").classList.remove("show");
  document.getElementById("hubView").style.display = "block";
  renderHub(); // Re-render to update opened status
  window.scrollTo(0, 0);
}

// ---------- ENVELOPE OPEN ----------
function openEnvelopeAnimation() {
  if (isOpening) return;
  
  // Start background music on user click
  const music = document.getElementById("bgMusic");
  if (music) {
    music.volume = 0.4;
    music.play().catch(err => console.log("Autoplay prevented:", err));
  }
  
  isOpening = true;
  const envelope = document.getElementById("envelopeBox");
  const letter = document.getElementById("letterContainer");

  envelope.classList.add("open");
  setTimeout(() => triggerConfetti(), 600);
  setTimeout(() => {
    envelope.classList.add("fade-out");
    setTimeout(() => {
      document.getElementById("envelopeScreen").classList.remove("show");
      letter.classList.add("show");
      if (current) markOpened(current.id);
      startTypewriter();
    }, 400);
  }, 1200);
}

// Mark letter as opened in Firebase
function markOpened(id) {
  const openedRef = db.ref('opened/' + id);
  openedRef.set({
    openedAt: new Date().toISOString(),
    opened: true
  }).catch(err => console.error("Error saving opened status:", err));
}

// ---------- TYPEWRITER ----------
function startTypewriter() {
  typing = true;
  const token = ++typeToken;
  const body = document.getElementById("letterBody");
  body.innerHTML = "";
  document.getElementById("skipArea").style.display = "block";
  const paras = current.letter;
  let pi = 0;

  const keyboardNeighbors = {
    a: "qwsz", b: "vghn", c: "xdfv", d: "erfcxs", e: "wsdr",
    f: "rtgvcd", g: "tyhbvf", h: "yujnbg", i: "ujko", j: "uikmnh",
    k: "ijolm", l: "kop", m: "njk", n: "bhjm", o: "iklp",
    p: "ol", q: "wa", r: "edft", s: "wedxza", t: "rfgy",
    u: "yhji", v: "cfgb", w: "qeas", x: "zsdc", y: "tghu", z: "asx"
  };

  function getRandomWrongChar(char) {
    const lower = char.toLowerCase();
    const choices = keyboardNeighbors[lower];
    if (!choices) return "a";
    const wrong = choices[Math.floor(Math.random() * choices.length)];
    return char === char.toUpperCase() ? wrong.toUpperCase() : wrong;
  }

  function typeNextPara() {
    if (!typing || token !== typeToken) return;
    if (pi >= paras.length) { finishTyping(); return; }

    const p = document.createElement("p");
    const cursor = document.createElement("span");
    cursor.className = "type-cursor";
    p.appendChild(cursor);
    body.appendChild(p);

    const text = paras[pi];
    let ci = 0;

    function tick() {
      if (!typing || token !== typeToken) return;

      if (ci < text.length) {
        const targetChar = text[ci];
        const shouldMakeTypo = Math.random() < 0.03 && /[a-zA-Z]/.test(targetChar);

        if (shouldMakeTypo) {
          const wrongChar = getRandomWrongChar(targetChar);
          cursor.insertAdjacentText("beforebegin", wrongChar);
          
          setTimeout(() => {
            if (!typing || token !== typeToken) return;
            const textNode = cursor.previousSibling;
            if (textNode && textNode.nodeType === Node.TEXT_NODE) {
              textNode.nodeValue = textNode.nodeValue.slice(0, -1);
            }
            setTimeout(tick, Math.floor(Math.random() * 40) + 30);
          }, Math.floor(Math.random() * 70) + 50);
          return;
        }

        cursor.insertAdjacentText("beforebegin", targetChar);
        ci++;

        let delay = Math.floor(Math.random() * 20) + 15;
        if (targetChar === " ") {
          delay += Math.floor(Math.random() * 15) + 5; 
        } else if ([".", ",", "!", "?", ";"].includes(targetChar)) {
          delay += Math.floor(Math.random() * 100) + 60;
        }

        setTimeout(tick, delay);
      } else {
        cursor.remove();
        pi++;
        setTimeout(typeNextPara, Math.floor(Math.random() * 200) + 200); 
      }
    }

    tick();
  }

  typeNextPara();
}

function finishTyping() {
  typing = false;
  document.getElementById("skipArea").style.display = "none";
  document.getElementById("letterBody").innerHTML =
    current.letter.map(t => "<p>" + t + "</p>").join("");
}

function skipTyping() {
  typeToken++;
  finishTyping();
}

// ---------- AWARD SCROLL CONFETTI ----------
let awardFired = false;
const awardObserver = new IntersectionObserver(entries => {
  entries.forEach(en => {
    if (en.isIntersecting && !awardFired) {
      awardFired = true;
      confetti({
        particleCount: 80, spread: 70, startVelocity: 40,
        origin: { y: en.boundingClientRect.top / window.innerHeight },
        colors: ["#ffbe0b", "#ff527b", "#ffffff"]
      });
    }
  });
}, { threshold: 0.5 });

// Observe when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const awardCard = document.getElementById("awardCard");
  if (awardCard) awardObserver.observe(awardCard);
});

// ---------- EASTER EGG: CLICK SIGNATURE 5x ----------
document.addEventListener('DOMContentLoaded', () => {
  const signature = document.getElementById("signature");
  if (signature) {
    signature.addEventListener("click", () => {
      if (!current) return;
      sigClicks++;
      clearTimeout(sigResetTimer);
      sigResetTimer = setTimeout(() => { sigClicks = 0; }, 2500);
      if (sigClicks === 3) {
        confetti({ particleCount: 10, spread: 30, origin: { y: 0.7 }, scalar: 0.7 });
      }
      if (sigClicks >= 5) {
        sigClicks = 0;
        const msg = document.getElementById("secretMsg");
        msg.innerText = current.secretMsg;
        msg.classList.add("show");
        triggerConfetti();
      }
    });
  }
});

// ---------- SPAM LOVE ----------
function spamLove(e) {
  confetti({
    particleCount: 25, spread: 50,
    origin: { x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight }
  });
  const hearts = ["💖", "💕", "✨", "🌸", "🥰", "🧁"];
  for (let i = 0; i < 6; i++) {
    const heart = document.createElement("div");
    heart.classList.add("floating-heart");
    heart.innerText = hearts[Math.floor(Math.random() * hearts.length)];
    heart.style.left = (e.clientX + (Math.random() * 80 - 40)) + "px";
    heart.style.top = (e.clientY + (Math.random() * 20 - 10)) + "px";
    document.body.appendChild(heart);
    setTimeout(() => heart.remove(), 2000);
  }
}

// ---------- CONFETTI EXPLOSION ----------
function triggerConfetti() {
  var count = 200;
  var defaults = { origin: { y: 0.6 } };
  function fire(particleRatio, opts) {
    confetti(Object.assign({}, defaults, opts, {
      particleCount: Math.floor(count * particleRatio)
    }));
  }
  fire(0.25, { spread: 26, startVelocity: 55 });
  fire(0.2, { spread: 60 });
  fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
  fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
  fire(0.1, { spread: 120, startVelocity: 45 });
}

// ---------- CURSOR HEART TRAIL ----------
let lastTrail = 0;
document.addEventListener("mousemove", e => {
  const now = Date.now();
  if (now - lastTrail < 90) return;
  lastTrail = now;
  const trail = document.createElement("div");
  trail.className = "cursor-trail";
  trail.innerText = ["💖", "💕", "✨", "🌸"][Math.floor(Math.random() * 4)];
  trail.style.left = e.clientX + "px";
  trail.style.top = e.clientY + "px";
  document.body.appendChild(trail);
  setTimeout(() => trail.remove(), 900);
});

// ---------- GREETING LANDING ----------
let initialRoutePerson = null;

async function enterMainPage() {
  const greeting = document.getElementById("greetingScreen");
  const main = document.getElementById("mainContent");
  const music = document.getElementById("bgMusic");

  if (music) {
    music.volume = 0.4;
    music.play().catch(err => console.log("Music could not start:", err));
  }

  greeting.classList.add("hidden");

  setTimeout(async () => {
    greeting.style.display = "none";
    main.classList.add("show");

    // ALWAYS show the hub view
    document.getElementById("hubView").style.display = "block";
    await renderHub(); // Wait for hub to render
  }, 350);
}

// Ensure greeting button listener is attached when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const greetingBtn = document.getElementById("greetingOpen");
  if (greetingBtn) {
    greetingBtn.addEventListener("click", enterMainPage);
  } else {
    console.error("greetingOpen button not found!");
  }
});

// ---------- INIT: check for personal link (?p=...&key=...) ----------
(function init() {
  const params = new URLSearchParams(location.search);
  const pid = params.get("p");
  const key = params.get("key");

  if (pid) {
    const person = PEOPLE.find(x => x.id === pid);
    if (person && key && key.toUpperCase() === person.code.toUpperCase()) {
      // Just store the person, don't auto-click
      initialRoutePerson = person;
      // Optional: Clean URL immediately so refresh goes to hub
      history.replaceState(null, "", location.pathname);
    }
  }
})();