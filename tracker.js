//////////////////////////////
// Global Variables
//////////////////////////////

let pages = [];
let currentPage;

let mainMenu;
let vibrationGuidePage;
let playbackMenuTennis;
let playbackMatchPageTennis;

let images = [];

// Tennis ball images (using football assets as temporary stand-ins)
let ballTennisHome, ballTennisAway;

// Pause images
let tennisPaused;

// Overlay for playback pause
let playbackPauseImg;

// Vibration guide background
let vibrationsBgImg;

// Playback background for tennis (using soccer asset as temporary stand-in)
let playbackBgTennis;

// Match button image paths (used as <img> src in DOM buttons)
const matchButtonImages = [
  'images/demo1.webp',
  'images/demo2.webp',
  'images/demo3.webp',
  'images/demo4.webp',
];

// Dimensions
let appWidth = 1200;
let appHeight = 800;

let connectionLost = false;

// Possession constants
const POSSESSION_NEUTRAL = 66;
const POSSESSION_HOME = 1;
const POSSESSION_AWAY = 0;

let myFont;
let backgroundImg;

// WebSocket URL for playback
const PLAYBACK_WS = "wss://cxgmjito89.execute-api.eu-west-1.amazonaws.com/production";

//////////////////////////////
// Base Page Class
//////////////////////////////

class Page {
  constructor() {
    this.controllers = [];
    this.background = null;
    this.font = null;
    this.visible = true;
  }

  show() {
    if (this.visible) return;
    this.visible = true;
    for (let p of pages) {
      if (p === this) continue;
      p.hide();
    }
    if (this.background) background(this.background);
    for (let c of this.controllers) c.show();
  }

  hide() {
    if (!this.visible) return;
    this.visible = false;
    for (let c of this.controllers) c.hide();
  }
}

function addPages(...pgs) {
  for (let p of pgs) {
    pages.push(p);
    p.hide();
  }
}

//////////////////////////////
// Main Menu (BEGIN + Vibration Guide)
//////////////////////////////

class MainPage extends Page {
  constructor() {
    super();
    this.font = myFont;
    this.background = backgroundImg;
    this.beginButton = null;
    this.vibrationButton = null;
    this.initGUI();
  }

  initGUI() {
    // BEGIN button
    this.beginButton = createButton('BEGIN');
    this.beginButton.parent('ui-container');
    this.beginButton.class('start-button');
    this.beginButton.mousePressed(() => {
      currentPage = playbackMenuTennis;
      currentPage.show();
    });
    this.controllers.push(this.beginButton);

    // Vibration Guide button
    this.vibrationButton = createButton('Vibration Guide');
    this.vibrationButton.parent('ui-container');
    this.vibrationButton.class('start-button vibration-button');
    this.vibrationButton.mousePressed(() => {
      currentPage = vibrationGuidePage;
      currentPage.show();
    });
    this.controllers.push(this.vibrationButton);
  }

  show() {
    super.show();
    if (this.background) background(this.background);
  }
}

//////////////////////////////
// Vibration Guide
//////////////////////////////

class VibrationGuidePage extends Page {
  constructor() {
    super();
    this.background = vibrationsBgImg;
    this.possession = 0; // 0 = Player 1, 1 = Player 2
    this.panel = select('#vibration-panel');
    this.player1Btn = null;
    this.player2Btn = null;
    this.initUI();
  }

  initUI() {
    // Player toggle
    const toggleDiv = createElement('div');
    toggleDiv.class('player-toggle');
    toggleDiv.parent(this.panel);

    this.player1Btn = createElement('button', 'Player 1');
    this.player1Btn.parent(toggleDiv);
    this.player1Btn.class('active');
    this.player1Btn.mousePressed(() => this.setPlayer(0));

    this.player2Btn = createElement('button', 'Player 2');
    this.player2Btn.parent(toggleDiv);
    this.player2Btn.mousePressed(() => this.setPlayer(1));

    // Vibration button grid
    const grid = createElement('div');
    grid.id('vibration-grid');
    grid.parent(this.panel);

    const events = [
      { label: 'Serve',         field: 'serve' },
      { label: 'Ball Hits Net', field: 'point_net' },
      { label: 'Point Won',     field: 'point_other' },
      { label: 'Ace',           field: 'ace' },
    ];

    for (const evt of events) {
      const btn = createElement('button', evt.label);
      btn.class('vib-button');
      btn.parent(grid);
      btn.mousePressed(() => this.sendVibration(evt.field));
    }

    // Game Won (wider button spanning both columns)
    const gameWonBtn = createElement('button', 'Game Won');
    gameWonBtn.class('vib-button game-won');
    gameWonBtn.parent(grid);
    gameWonBtn.mousePressed(() => this.sendVibration('point_other'));

    // Back hint
    const backBtn = createElement('button', 'Press ESC to return');
    backBtn.class('vib-back');
    backBtn.parent(this.panel);
    backBtn.mousePressed(() => this.goBack());
  }

  setPlayer(p) {
    this.possession = p;
    if (p === 0) {
      this.player1Btn.class('active');
      this.player2Btn.removeClass('active');
    } else {
      this.player2Btn.class('active');
      this.player1Btn.removeClass('active');
    }
  }

  sendVibration(field) {
    const msg = {
      action: 'dalymount_IRL_sendMessage',
      message: {
        x: 48,
        y: 32,
        serve: 0,
        ace: 0,
        point_net: 0,
        point_out_or_serve_fault: 0,
        point_other: 0,
        possession: this.possession,
      }
    };
    msg.message[field] = 1;
    webSendJson(JSON.stringify(msg));
  }

  showPanel() {
    this.panel.style('display', 'flex');
  }

  hidePanel() {
    this.panel.style('display', 'none');
  }

  goBack() {
    this.hidePanel();
    currentPage = mainMenu;
    currentPage.show();
  }

  show() {
    super.show();
    if (this.background) {
      imageMode(CORNER);
      image(this.background, 0, 0, appWidth, appHeight);
    }
    this.showPanel();
    webConnect(PLAYBACK_WS);
  }

  hide() {
    super.hide();
    this.hidePanel();
  }

  onKeyPressed() {
    if (keyCode === ESCAPE) {
      this.goBack();
    }
  }
}

//////////////////////////////
// PlaybackMenu for Tennis
//////////////////////////////

class PlaybackMenuTennis extends Page {
  constructor() {
    super();
    this.background = playbackBgTennis;
    this.matchGrid = select('#match-grid');
    this.buttons = [];
    this.initButtons();
  }

  initButtons() {
    for (let i = 0; i < 4; i++) {
      const matchNum = i + 1;
      const btn = createElement('button');
      btn.class('match-button');
      btn.parent(this.matchGrid);

      const img = createElement('img');
      img.attribute('src', matchButtonImages[i]);
      img.attribute('alt', `Match ${matchNum}`);
      img.parent(btn);

      btn.mousePressed(() => this.onMatchClick(matchNum));
      this.buttons.push(btn);
    }
  }

  onMatchClick(matchNum) {
    playbackMatchPageTennis.loadJSONFile(`data/demo${matchNum}.json`);
    playbackMatchPageTennis.loadAudio(`data/demo${matchNum}.mp3`);
    playbackMatchPageTennis.startInPause();
    this.hideGrid();
    currentPage = playbackMatchPageTennis;
  }

  showGrid() {
    this.matchGrid.style('display', 'grid');
  }

  hideGrid() {
    this.matchGrid.style('display', 'none');
  }

  show() {
    super.show();
    image(this.background, 0, 0, width, height);
    this.showGrid();
  }

  hide() {
    super.hide();
    this.hideGrid();
  }

  onKeyPressed() {
    if (keyCode === ESCAPE) {
      this.hideGrid();
      currentPage = mainMenu;
      currentPage.show();
    }
  }
}

//////////////////////////////
// PlaybackMatchPage (Tennis)
//////////////////////////////

class PlaybackMatchPageTennis extends Page {
  constructor() {
    super();
    this.selectedImageIndex = 0; // tennis court (using football pitch as stand-in)
    this.sport = 'tennis';
    this.playbackPauseImg = playbackPauseImg;

    this.jsonData = null;
    this.jsonArray = [];
    this.jsonSize = 0;

    this.startPlaybackTime = 0;
    this.isPaused = true;
    this.pauseStartTime = 0;
    this.totalPausedDuration = 0;
    this.counter = 0;
    this.baseT = 0;
    this.hasStarted = false;

    this.actionMessages = [];
    this.ballX = 0;
    this.ballY = 0;
    this.possession = POSSESSION_NEUTRAL;

    this.audio = null;
  }

  setBallTo(msg) {
    let scaleX = appWidth / 102;
    let scaleY = appHeight / 64;
    this.ballX = msg.X * scaleX;
    this.ballY = msg.Y * scaleY;
    this.possession = msg.P;
  }

  homeBall() {
    if (this.jsonSize > 0 && this.jsonArray[0].message) {
      let firstMsg = this.jsonArray[0].message;
      this.setBallTo(firstMsg);
      let homeMsg = {
        action: 'dalymount_IRL_sendMessage',
        message: { ...firstMsg }
      };
      webSendJson(JSON.stringify(homeMsg));
    }
  }

  loadJSONFile(filepath) {
    loadJSON(filepath, (data) => {
      this.jsonData = data;
      if (!data || !data.data) {
        this.jsonArray = [];
        this.jsonSize = 0;
        this.baseT = 0;
      } else {
        this.jsonArray = data.data;
        this.jsonSize = this.jsonArray.length;
        if (this.jsonSize > 0 && this.jsonArray[0].message) {
          this.baseT = this.jsonArray[0].message.T;
          if (this.isPaused) this.homeBall();
        } else {
          this.baseT = 0;
        }
      }
    });
  }

  loadAudio(audioPath) {
    if (this.audio) {
      this.audio.stop();
      this.audio = null;
    }
    this.audio = loadSound(audioPath, () => this.audio.stop());
  }

  startInPause() {
    this.isPaused = true;
    this.hasStarted = false;
    this.counter = 0;
    this.totalPausedDuration = 0;
    this.startPlaybackTime = millis();
    webConnect(PLAYBACK_WS);
  }

  addActionMessage(msg, duration) {
    this.actionMessages.push({ text: msg, expire: millis() + duration });
  }

  show() {
    super.show();
    image(images[this.selectedImageIndex], 0, 0, 1200, 800);

    const imgSize = 65;
    if (this.possession === POSSESSION_HOME) {
      image(ballTennisHome, this.ballX - imgSize / 2, this.ballY - imgSize / 2, imgSize, imgSize);
    } else {
      image(ballTennisAway, this.ballX - imgSize / 2, this.ballY - imgSize / 2, imgSize, imgSize);
    }

    if (this.isPaused) {
      imageMode(CORNER);
      image(this.playbackPauseImg, 0, 0, 1200, 800);
    }

    push();
    textSize(25);
    textStyle(BOLD);
    textAlign(CENTER, CENTER);
    fill('#004d61');
    let now = millis();
    this.actionMessages = this.actionMessages.filter(m => now < m.expire);
    if (this.actionMessages.length > 0) {
      text(this.actionMessages[this.actionMessages.length - 1].text.toUpperCase(), 0, 55, width, 32.9);
    }
    pop();

    if (!this.isPaused && this.counter < this.jsonSize) {
      let entry = this.jsonArray[this.counter];
      if (entry && entry.message) {
        let scheduled = this.startPlaybackTime + (entry.message.T - this.baseT) * 1000 + this.totalPausedDuration;
        if (millis() >= scheduled) {
          this.processEntry(entry.message);
          this.counter++;
        }
      }
    }
  }

  processEntry(msg) {
    this.setBallTo(msg);
    if (msg.Pa === 1) this.addActionMessage("Shot", 500);
    if (msg.G === 1) this.addActionMessage("Point!", 4000);
    if (msg.C === 1) this.addActionMessage("Ace!", 2000);
    if (msg.R === 1) this.addActionMessage("Rally", 500);
    if (msg.S === 1) this.addActionMessage("Serve", 1000);

    let playbackMsg = {
      action: 'dalymount_IRL_sendMessage',
      message: { ...msg }
    };
    webSendJson(JSON.stringify(playbackMsg));
  }

  onKeyPressed() {
    if (keyCode === ESCAPE) {
      if (this.audio) this.audio.stop();
      this.isPaused = true;
      this.hasStarted = false;
      currentPage = playbackMenuTennis;
      return;
    }
    if (key === 'r' || key === 'R') {
      this.counter = 0;
      this.totalPausedDuration = 0;
      this.startPlaybackTime = millis();
      this.isPaused = true;
      this.hasStarted = false;
      if (this.audio) this.audio.stop();
      return;
    }
    if (key === ' ') {
      if (this.isPaused) {
        if (!this.hasStarted) {
          this.hasStarted = true;
          this.counter = 0;
          this.totalPausedDuration = 0;
          this.startPlaybackTime = millis();
          if (this.audio) { this.audio.stop(); this.audio.play(0); }
        } else {
          this.totalPausedDuration += millis() - this.pauseStartTime;
          if (this.audio) this.audio.play();
        }
        this.isPaused = false;
      } else {
        this.pauseStartTime = millis();
        if (this.audio) this.audio.pause();
        this.isPaused = true;
      }
    }
  }
}

//////////////////////////////
// WebSocket + Connection
//////////////////////////////

let requests = [];
let socket = null;

function webConnect(uri) {
  if (socket && socket.readyState === WebSocket.OPEN) return;
  socket = new WebSocket(uri);
  socket.onopen = () => connectionLost = false;
  socket.onclose = () => connectionLost = true;
  socket.onerror = (error) => console.error('WebSocket error:', error);
}

function webDisconnect() {
  if (!socket || socket.readyState !== WebSocket.OPEN) return;
  while (requests.length > 0 && socket.readyState === WebSocket.OPEN) {
    socket.send(requests.shift());
  }
  socket.close();
}

function webSendJson(json) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(json);
  } else {
    requests.push(json);
  }
}

function webThread() {
  setInterval(() => {
    while (requests.length > 0 && socket?.readyState === WebSocket.OPEN) {
      socket.send(requests.shift());
    }
  }, 5);
}

function checkInternetConnectionThread() {
  let wasConnected = navigator.onLine;
  setInterval(() => {
    let isConnected = navigator.onLine;
    if (wasConnected !== isConnected) {
      connectionLost = !isConnected;
      wasConnected = isConnected;
    }
  }, 5000);
}

function webSetup() {
  webThread();
  checkInternetConnectionThread();
  window.addEventListener('online',  () => connectionLost = false);
  window.addEventListener('offline', () => connectionLost = true);
}

//////////////////////////////
// p5.js Lifecycle
//////////////////////////////

function setup() {
  const cnv = createCanvas(appWidth, appHeight);
  cnv.parent('canvas-container');
  cnv.elt.getContext('2d', {
    alpha: false,
    desynchronized: true,
    powerPreference: "high-performance"
  });

  mainMenu               = new MainPage();
  vibrationGuidePage     = new VibrationGuidePage();
  playbackMenuTennis     = new PlaybackMenuTennis();
  playbackMatchPageTennis = new PlaybackMatchPageTennis();

  addPages(
    mainMenu,
    vibrationGuidePage,
    playbackMenuTennis,
    playbackMatchPageTennis
  );

  currentPage = mainMenu;
  currentPage.show();

  frameRate(30);
  webSetup();
}

function draw() {
  if (currentPage?.show) currentPage.show();
  if (connectionLost) displayConnectionWarning();
}

function displayConnectionWarning() {
  fill(255, 0, 0);
  textSize(32);
  textAlign(CENTER, CENTER);
  text('Connection lost!', width / 2, height / 2);
}

function keyPressed() {
  if (currentPage?.onKeyPressed) currentPage.onKeyPressed();
}

function mousePressed(event) {
  if (currentPage?.handleMousePressed) currentPage.handleMousePressed(event);
}

function preload() {
  // Font
  myFont = loadFont('assets/arial.ttf');

  // Main menu background
  backgroundImg = loadImage('images/background.webp');

  // Playback pause overlay
  playbackPauseImg = loadImage('images/pause.webp');

  // Tennis court background (shown during playback)
  images[0] = loadImage('images/court.webp');

  // Pause overlay for match playback
  tennisPaused = loadImage('images/pause.webp');

  // Ball images (home/away possession)
  ballTennisHome = loadImage('images/home.webp');
  ballTennisAway = loadImage('images/away.webp');

  // Tennis playback menu background
  playbackBgTennis = loadImage('images/playback background.webp');

  // Vibration guide background
  vibrationsBgImg = loadImage('images/vibrations.webp');
}
