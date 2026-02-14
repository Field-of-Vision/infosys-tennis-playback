//////////////////////////////
// Global Variables
//////////////////////////////

let pages = [];
let currentPage;

let mainMenu;
let setupPage;
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

// Overlay for video playback
let overlayImg;

// Vibration guide background
let vibrationsBgImg;

// Setup guide background
let setupBgImg;

// Playback background for tennis (using soccer asset as temporary stand-in)
let playbackBgTennis;

// Match button image paths (used as <img> src in DOM buttons)
const matchButtonImages = [
  'images/demo1.webp',
  'images/demo2.webp',
];

// Preloaded demo videos (indexed 0-3 for demo1-demo4)
let demoVideos = [];

// Dimensions (1080p)
let appWidth = 1920;
let appHeight = 1080;

let connectionLost = false;

// Possession constants
const POSSESSION_NEUTRAL = 66;
const POSSESSION_HOME = 1;
const POSSESSION_AWAY = 0;

let myFont;
let backgroundImg;

// WebSocket URL for playback
//Websocket for tennis commented out for now
const PLAYBACK_WS = "wss://jd2iqh9o32.execute-api.ap-southeast-2.amazonaws.com/production";
//const PLAYBACK_WS = "wss://tgh899snfl.execute-api.ap-southeast-2.amazonaws.com/production";

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
    this.setupButton = null;
    this.beginButton = null;
    this.vibrationButton = null;
    this.initGUI();
  }

  initGUI() {
    // Setup Guide button (left)
    this.setupButton = createButton('Setup<br>Guide');
    this.setupButton.parent('ui-container');
    this.setupButton.class('side-button');
    this.setupButton.mousePressed(() => {
      currentPage = setupPage;
      currentPage.show();
    });
    this.controllers.push(this.setupButton);

    // BEGIN button (center)
    this.beginButton = createButton('Begin');
    this.beginButton.parent('ui-container');
    this.beginButton.class('center-button');
    this.beginButton.mousePressed(() => {
      currentPage = playbackMenuTennis;
      currentPage.show();
    });
    this.controllers.push(this.beginButton);

    // Vibration Guide button (right)
    this.vibrationButton = createButton('Vibration<br>Guide');
    this.vibrationButton.parent('ui-container');
    this.vibrationButton.class('side-button');
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
// Setup Guide
//////////////////////////////

class SetupPage extends Page {
  constructor() {
    super();
    this.background = setupBgImg;

    // Back button
    this.backButton = createButton('← Back');
    this.backButton.class('back-button');
    this.backButton.mousePressed(() => this.goBack());
    this.backButton.hide();
  }

  show() {
    super.show();
    if (this.background) {
      imageMode(CORNER);
      image(this.background, 0, 0, appWidth, appHeight);
    }
    this.backButton.show();
  }

  hide() {
    super.hide();
    this.backButton.hide();
  }

  goBack() {
    currentPage = mainMenu;
    currentPage.show();
  }

  onKeyPressed() {
    if (keyCode === ESCAPE) {
      this.goBack();
    }
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

    // Back button
    this.backButton = createButton('← Back');
    this.backButton.class('back-button');
    this.backButton.mousePressed(() => this.goBack());
    this.backButton.hide();
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
      action: 'kia_AUS_sendMessage',
      message: {
        x: 51,
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
    this.backButton.show();
  }

  hide() {
    super.hide();
    this.hidePanel();
    this.backButton.hide();
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

    // Back button
    this.backButton = createButton('← Back');
    this.backButton.class('back-button');
    this.backButton.mousePressed(() => this.goBack());
    this.backButton.hide();
  }

  initButtons() {
    // Only show demo1 and demo2 (comment out demo3 and demo4)
    const activeMatches = [0, 1]; // indices for demo1 and demo2
    for (let i of activeMatches) {
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
    playbackMatchPageTennis.loadVideo(matchNum);
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
    image(this.background, 0, 0, appWidth, appHeight);
    this.showGrid();
    this.backButton.show();
  }

  hide() {
    super.hide();
    this.hideGrid();
    this.backButton.hide();
  }

  goBack() {
    this.hideGrid();
    currentPage = mainMenu;
    currentPage.show();
  }

  onKeyPressed() {
    if (keyCode === ESCAPE) {
      this.goBack();
    }
  }
}

//////////////////////////////
// PlaybackMatchPage (Tennis)
//////////////////////////////

class PlaybackMatchPageTennis extends Page {
  constructor() {
    super();
    this.selectedImageIndex = 0;
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
    this.hasStarted = false;

    this.actionMessages = [];
    this.ballX = 0;
    this.ballY = 0;
    this.possession = POSSESSION_NEUTRAL;

    this.audio = null;

    // Video (references preloaded demoVideos)
    this.video = null;

    // Back button
    this.backButton = createButton('← Back');
    this.backButton.class('back-button');
    this.backButton.mousePressed(() => this.goBack());
    this.backButton.hide();
    this.hasVideo = false;
    this.lastVideoFrame = -1;
    this.videoDimensions = { drawWidth: 0, drawHeight: 0, offsetX: 0, offsetY: 0 };
    this.dimensionsCalculated = false;
  }

  setBallTo(msg) {
    let scaleX = appWidth / 102;
    let scaleY = appHeight / 64;
    this.ballX = msg.x * scaleX;
    this.ballY = msg.y * scaleY;
    this.possession = msg.possession;
  }

  homeBall() {
    if (this.jsonSize > 0) {
      let firstMsg = this.jsonArray[0];
      this.setBallTo(firstMsg);
      let homeMsg = {
        action: 'kia_AUS_sendMessage',
        message: { ...firstMsg }
      };
      webSendJson(JSON.stringify(homeMsg));
    }
  }

  loadJSONFile(filepath) {
    // Load as raw text since the file is newline-delimited JSON objects
    fetch(filepath)
      .then(r => r.text())
      .then(text => {
        // Split on }{ boundaries to get individual JSON objects
        const objects = text.trim().replace(/\}\s*\{/g, '}|||{').split('|||');
        this.jsonArray = objects.map(s => {
          try { return JSON.parse(s); } catch(e) { return null; }
        }).filter(Boolean);
        this.jsonSize = this.jsonArray.length;
        console.log(`Loaded ${this.jsonSize} entries from ${filepath}`);
        if (this.jsonSize > 0 && this.isPaused) this.homeBall();
      });
  }

  loadAudio(audioPath) {
    if (this.audio) {
      this.audio.stop();
      this.audio = null;
    }
    this.audio = loadSound(audioPath, () => this.audio.stop());
  }

  loadVideo(matchNum) {
    // Stop previous video if any
    if (this.video) {
      this.video.pause();
      this.video.elt.currentTime = 0;
    }
    this.dimensionsCalculated = false;
    this.lastVideoFrame = -1;

    const idx = matchNum - 1;
    if (idx >= 0 && idx < demoVideos.length && demoVideos[idx]) {
      this.video = demoVideos[idx];
      this.hasVideo = true;
      this.video.elt.currentTime = 0;
    } else {
      this.video = null;
      this.hasVideo = false;
    }
  }

  startInPause() {
    this.isPaused = true;
    this.hasStarted = false;
    this.counter = 0;
    this.totalPausedDuration = 0;
    this.startPlaybackTime = millis();
    this.lastVideoFrame = -1;
  }

  addActionMessage(msg, duration) {
    this.actionMessages.push({ text: msg, expire: millis() + duration });
  }

  show() {
    super.show();
    this.backButton.show();

    // If video is playing, draw it; otherwise show court + ball
    if (this.hasVideo && !this.isPaused && this.hasStarted) {
      this.drawCroppedVideo();
      // Draw overlay on top of video during playback
      if (overlayImg) {
        imageMode(CORNER);
        image(overlayImg, 0, 0, appWidth, appHeight);
      }
    } else {
      image(images[this.selectedImageIndex], 0, 0, appWidth, appHeight);

      const imgSize = 65;
      if (this.possession === POSSESSION_HOME) {
        image(ballTennisHome, this.ballX - imgSize / 2, this.ballY - imgSize / 2, imgSize, imgSize);
      } else {
        image(ballTennisAway, this.ballX - imgSize / 2, this.ballY - imgSize / 2, imgSize, imgSize);
      }
    }

    if (this.isPaused) {
      imageMode(CORNER);
      image(this.playbackPauseImg, 0, 0, appWidth, appHeight);
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
      if (entry) {
        // Send entry when its timestamp (t in seconds) is reached
        let scheduled = this.startPlaybackTime + (entry.t || 0) * 1000 + this.totalPausedDuration;
        if (millis() >= scheduled) {
          this.processEntry(entry);
          this.counter++;
        }
      }
    }
  }

  calculateVideoDimensions() {
    if (!this.video || this.dimensionsCalculated) return;
    let videoAspect = this.video.width / this.video.height;
    let appAspect = appWidth / appHeight;
    if (videoAspect > appAspect) {
      this.videoDimensions.drawHeight = appHeight;
      this.videoDimensions.drawWidth = appHeight * videoAspect;
      this.videoDimensions.offsetX = (appWidth - this.videoDimensions.drawWidth) / 2;
      this.videoDimensions.offsetY = 0;
    } else {
      this.videoDimensions.drawWidth = appWidth;
      this.videoDimensions.drawHeight = appWidth / videoAspect;
      this.videoDimensions.offsetX = 0;
      this.videoDimensions.offsetY = (appHeight - this.videoDimensions.drawHeight) / 2;
    }
    this.dimensionsCalculated = true;
  }

  drawCroppedVideo() {
    if (!this.video) return;
    this.calculateVideoDimensions();

    let currentFrame = this.video.time();
    if (currentFrame === this.lastVideoFrame) return;
    this.lastVideoFrame = currentFrame;

    push();
    imageMode(CORNER);
    let { drawWidth, drawHeight, offsetX, offsetY } = this.videoDimensions;
    if (offsetX < 0) {
      let sourceX = Math.abs(offsetX) * (this.video.width / drawWidth);
      let sourceW = appWidth * (this.video.width / drawWidth);
      copy(this.video, sourceX, 0, sourceW, this.video.height, 0, 0, appWidth, appHeight);
    } else if (offsetY < 0) {
      let sourceY = Math.abs(offsetY) * (this.video.height / drawHeight);
      let sourceH = appHeight * (this.video.height / drawHeight);
      copy(this.video, 0, sourceY, this.video.width, sourceH, 0, 0, appWidth, appHeight);
    } else {
      image(this.video, offsetX, offsetY, drawWidth, drawHeight);
    }
    pop();
  }

  processEntry(msg) {
    this.setBallTo(msg);
    if (msg.serve === 1) this.addActionMessage("Serve", 1000);
    if (msg.ace === 1) this.addActionMessage("Ace!", 2000);
    if (msg.point_net === 1) this.addActionMessage("Net!", 1500);
    if (msg.point_other === 1) this.addActionMessage("Point!", 4000);
    if (msg.point_out_or_serve_fault === 1) this.addActionMessage("Fault!", 1500);

    let playbackMsg = {
      action: 'kia_AUS_sendMessage',
      message: { ...msg }
    };
    console.log(`T:${msg.t} X:${msg.x} Y:${msg.y} P:${msg.possession}`, msg);
    webSendJson(JSON.stringify(playbackMsg));
  }

  stopAll() {
    if (this.audio) this.audio.stop();
    if (this.video && this.hasVideo) {
      this.video.pause();
      this.video.elt.currentTime = 0;
    }
  }

  onKeyPressed() {
    if (keyCode === ESCAPE) {
      this.stopAll();
      this.isPaused = true;
      this.hasStarted = false;
      currentPage = playbackMenuTennis;
      return;
    }
    if (key === 'r' || key === 'R') {
      this.stopAll();
      this.counter = 0;
      this.totalPausedDuration = 0;
      this.startPlaybackTime = millis();
      this.isPaused = true;
      this.hasStarted = false;
      this.lastVideoFrame = -1;
      if (this.jsonSize > 0) this.homeBall();
      return;
    }
    if (key === ' ') {
      if (this.isPaused) {
        if (!this.hasStarted) {
          // First play
          this.hasStarted = true;
          this.counter = 0;
          this.totalPausedDuration = 0;
          this.startPlaybackTime = millis();
          this.lastVideoFrame = -1;
          if (this.audio) { this.audio.stop(); this.audio.play(0); }
          if (this.video && this.hasVideo) {
            this.video.elt.currentTime = 0;
            this.video.play();
          }
        } else {
          // Resume from pause
          this.totalPausedDuration += millis() - this.pauseStartTime;
          if (this.audio) this.audio.play();
          if (this.video && this.hasVideo) this.video.play();
        }
        this.isPaused = false;
      } else {
        // Pause
        this.pauseStartTime = millis();
        if (this.audio) this.audio.pause();
        if (this.video && this.hasVideo) this.video.pause();
        this.isPaused = true;
      }
    }
  }

  hide() {
    super.hide();
    this.backButton.hide();
  }

  goBack() {
    this.stopAll();
    this.isPaused = true;
    this.hasStarted = false;
    currentPage = playbackMenuTennis;
  }
}

//////////////////////////////
// WebSocket + Connection
//////////////////////////////

let requests = [];
let socket = null;

function webConnect(uri) {
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) return;
  console.log(`WebSocket connecting to: ${uri}`);
  socket = new WebSocket(uri);
  socket.onopen = () => { connectionLost = false; console.log(`WebSocket connected: ${uri}`); };
  socket.onclose = () => { connectionLost = true; console.log(`WebSocket disconnected: ${uri}`); };
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
    console.log(`WS SEND (open): ${json.substring(0, 120)}...`);
    socket.send(json);
  } else {
    const state = socket ? socket.readyState : 'no socket';
    console.warn(`WS QUEUED (state: ${state}): ${json.substring(0, 120)}...`);
    requests.push(json);
  }
}

function webThread() {
  setInterval(() => {
    while (requests.length > 0 && socket?.readyState === WebSocket.OPEN) {
      const msg = requests.shift();
      console.log(`WS FLUSH queued: ${msg.substring(0, 120)}...`);
      socket.send(msg);
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
  webConnect(PLAYBACK_WS);
  webThread();
  checkInternetConnectionThread();
  window.addEventListener('online',  () => connectionLost = false);
  window.addEventListener('offline', () => connectionLost = true);
}

//////////////////////////////
// p5.js Lifecycle
//////////////////////////////

function setup() {
  pixelDensity(1); // Force 1:1 pixel ratio regardless of display
  const cnv = createCanvas(appWidth, appHeight);
  cnv.parent('canvas-container');
  cnv.elt.getContext('2d', {
    alpha: false,
    desynchronized: true,
    powerPreference: "high-performance"
  });

  // Preload all demo videos so they're instantly ready
  for (let i = 1; i <= 2; i++) {
    const vid = createVideo(`data/demo${i}.mp4`, () => {
      vid.volume(0);
      vid.hide();
      vid.elt.preload = 'auto';
      vid.elt.playsinline = true;
      vid.elt.muted = true;
    });
    vid.elt.onerror = () => { demoVideos[i - 1] = null; };
    demoVideos.push(vid);
  }

  mainMenu               = new MainPage();
  setupPage              = new SetupPage();
  vibrationGuidePage     = new VibrationGuidePage();
  playbackMenuTennis     = new PlaybackMenuTennis();
  playbackMatchPageTennis = new PlaybackMatchPageTennis();

  addPages(
    mainMenu,
    setupPage,
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

  // Video overlay (shown during video playback)
  overlayImg = loadImage('images/overlay.webp');

  // Tennis court background (shown during playback)
  images[0] = loadImage('images/court.webp');

  // Pause overlay for match playback
  tennisPaused = loadImage('images/pause.webp');

  // Ball images (home/away possession)
  ballTennisHome = loadImage('images/home.webp');
  ballTennisAway = loadImage('images/away.webp');

  // Tennis playback menu background
  playbackBgTennis = loadImage('images/playback background.webp');

  // Setup guide background
  setupBgImg = loadImage('images/setup.webp');

  // Vibration guide background
  vibrationsBgImg = loadImage('images/vibrations.webp');
}
