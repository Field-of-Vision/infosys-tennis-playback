//////////////////////////////
// Global Variables
//////////////////////////////

let pages = [];
let currentPage;

let game;
let mainMenu;
let playbackMenuRugby;
let playbackMenuSoccer;
let playbackMenuAFL;
let playbackMatchPageRugby;
let playbackMatchPageSoccer;
let playbackMatchPageAFL;

let images = [];

// Sport-specific ball images
let ballFootballHome, ballFootballAway;
let ballAFLHome, ballAFLAway;
let ballRugbyHome, ballRugbyAway;

// Pause images
let paused;
let rugbyPaused;
let aflPaused;

// Overlay for playback pause
let playbackPauseImg;

// Playback backgrounds for rugby, soccer, and AFL
let playbackBgRugby, playbackBgMatch1Rugby, playbackBgMatch2Rugby, playbackBgMatch3Rugby, playbackBgMatch4Rugby;
let playbackBgSoccer, playbackBgMatch1Soccer, playbackBgMatch2Soccer, playbackBgMatch3Soccer, playbackBgMatch4Soccer;
let playbackBgAFL, playbackBgMatch1AFL, playbackBgMatch2AFL, playbackBgMatch3AFL;

// Dimensions
let appWidth = 1200;
let appHeight = 800;

let connectionLost = false;
let selectedMode = 'live';

const MILLI_SEC_DELAY = 100;
const START_LABEL = 'Start';
const LIST_LABEL = 'Stadium Selector:';

// State enumeration
const State = {
  PAUSED: 'PAUSED',
  ONGOING: 'ONGOING',
  FINISHED: 'FINISHED',
};

// Stadium names
const stadiums = [
  'Demonstration',
  'Marvel Stadium',
  'Port Vale',
  'Oxford United',
  'Aviva Stadium',
  'Aviva - Dublin',
  'Lincoln Financial',
];

// WebSocket URLs
const DALYMOUNT_PARK = "wss://cxgmjito89.execute-api.eu-west-1.amazonaws.com/production";
const MARVEL_STADIUM = "wss://tgh899snfl.execute-api.ap-southeast-2.amazonaws.com/production";
const DUBLIN = "wss://fu6ntwe8cc.execute-api.eu-west-1.amazonaws.com/production";

// Possession constants
const POSSESSION_NEUTRAL = 66;
const POSSESSION_HOME = 1;
const POSSESSION_AWAY = 0;

let myFont;
let backgroundImg;
let videoOverlayImg;

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
// Game (Live Tracker)
//////////////////////////////

class Game extends Page {
  constructor() {
    super();
    this.state = State.PAUSED;
    this.time = millis();

    this.passKick = 0;
    this.tryScore = 0;
    this.conversion = 0;
    this.ruck = 0;
    this.scrumMaul = 0;

    this.scrumFreeze = false;
    this.scrumStartTime = 0;
    this.scrumDuration = 6000;

    this.possession = POSSESSION_NEUTRAL;
    this.timestamp = 0;
    this.checkpoint = 0;
    this.selectedImage = -1;
    this.action = null;
    this.stadium = null;
    this.url = null;
    this.pausedImg = paused;
    this.sendCounter = 0;
    this.sport = "";

    this.actionMessages = [];
    this.sentMessages = [];
  }

  addActionMessage(msg, duration) {
    this.actionMessages.push({ text: msg, expire: millis() + duration });
  }

  setStadium(url, stadium, selectedImageIndex) {
    this.url = url;
    this.stadium = stadium;
    this.selectedImage = selectedImageIndex;
    if (selectedImageIndex === 0 || selectedImageIndex === 2) {
      this.sport = "football";
      this.pausedImg = paused;
    } else if (selectedImageIndex === 1) {
      this.sport = "AFL";
      this.pausedImg = aflPaused;
    } else if (selectedImageIndex === 3) {
      this.sport = "rugby";
      this.pausedImg = rugbyPaused;
    }

    switch (this.stadium) {
      case 'Demonstration':
        this.action = 'dalymount_IRL_sendMessage';
        break;
      case 'Marvel Stadium':
        this.action = 'marvel_AUS_sendMessage';
        break;
      case 'Port Vale':
      case 'Oxford United':
        this.action = 'dalymount_IRL_sendMessage';
        break;
      case 'Aviva Stadium':
        this.action = 'dalymount_IRL_sendMessage';
        break;
      case 'Aviva - Dublin':
        this.action = 'dublin_IRL_sendMessage';
        break;
      case 'Lincoln Financial':
        this.action = 'dalymount_IRL_sendMessage';
        break;
      default:
        console.log("Unknown stadium, defaulting action to dalymount_IRL_sendMessage");
        this.action = 'dalymount_IRL_sendMessage';
    }
  }

  toJsonRequest() {
    if (!this.action) return "";
    const constrainedX = constrain(mouseX, 0, appWidth);
    const constrainedY = constrain(mouseY, 0, appHeight);
    const scaleFactorX = 102 / appWidth;
    const scaleFactorY = 64 / appHeight;

    const scaledX = parseFloat((constrainedX * scaleFactorX).toFixed(2));
    const scaledY = parseFloat((constrainedY * scaleFactorY).toFixed(2));

    return JSON.stringify({
      action: this.action,
      message: {
        T: parseFloat(this.timestamp.toFixed(2)),
        X: scaledX,
        Y: scaledY,
        P: this.possession,
        Pa: this.passKick,
        G: this.tryScore,
        C: this.conversion,
        R: this.ruck,
        S: this.scrumMaul,
      },
    });
  }

  show() {
    super.show();
    if (this.selectedImage < 0 || this.selectedImage >= images.length) {
      background(0);
      fill(255);
      textAlign(CENTER, CENTER);
      textSize(32);
      text('Please select a stadium from the main menu.', appWidth / 2, appHeight / 2);
      return;
    }

    image(images[this.selectedImage], 0, 0, 1200, 800);

    // Draw ball
    const imgSize = 65;
    let ballX = mouseX, ballY = mouseY;
    if (this.possession === POSSESSION_HOME) {
      if (this.sport === "football") {
        image(ballFootballHome, ballX - imgSize / 2, ballY - imgSize / 2, imgSize, imgSize);
      } else if (this.sport === "AFL") {
        image(ballAFLHome, ballX - imgSize / 2, ballY - imgSize / 2, imgSize, imgSize);
      } else {
        image(ballRugbyHome, ballX - imgSize / 2, ballY - imgSize / 2, imgSize, imgSize);
      }
    } else {
      if (this.sport === "football") {
        image(ballFootballAway, ballX - imgSize / 2, ballY - imgSize / 2, imgSize, imgSize + 10);
      } else if (this.sport === "AFL") {
        image(ballAFLAway, ballX - imgSize / 2, ballY - imgSize / 2, imgSize, imgSize);
      } else {
        image(ballRugbyAway, ballX - imgSize / 2, ballY - imgSize / 2, imgSize, imgSize);
      }
    }

    if (this.state === State.PAUSED) {
      imageMode(CORNER);
      image(this.pausedImg, 0, 0, 1200, 800);
    }

    // Ephemeral messages
    push();
    textSize(25);
    textStyle(BOLD);
    textAlign(CENTER, CENTER);
    fill('#004d61');
    let now = millis();
    this.actionMessages = this.actionMessages.filter(msgObj => now < msgObj.expire);
    if (this.actionMessages.length > 0) {
      let message = this.actionMessages[this.actionMessages.length - 1].text.toUpperCase();
      text(message, 0, 55, width, 32.9);
    }
    pop();

    // Sending loop
    const clock = millis();
    if (this.state === State.ONGOING && clock > this.time + MILLI_SEC_DELAY) {
      this.time = clock;

      if (this.scrumFreeze) {
        let elapsed = millis() - this.scrumStartTime;
        if (elapsed < this.scrumDuration) return;
        else {
          this.scrumFreeze = false;
          this.scrumMaul = 0;
        }
      }

      this.timestamp = (clock / 1000.0) - this.checkpoint;
      let msgStr = this.toJsonRequest();
      if (!msgStr) return;
      let msgObj = JSON.parse(msgStr);
      if (msgObj.action) {
        this.sentMessages.push(msgObj);
        webSendJson(msgStr);
      }

      this.passKick = 0;
      this.tryScore = 0;
      this.conversion = 0;
      this.ruck = 0;
      // scrumMaul remains until freeze ends
    }
  }

  onKeyPressed() {
    const k = key.toUpperCase();
    if (k === 'E') {
      if (selectedMode === 'live') {
        saveJSON({ data: this.sentMessages }, 'matchRecording.json');
      }
      return;
    }
    if (k === ' ') {
      this.state = (this.state === State.PAUSED) ? State.ONGOING : State.PAUSED;
      if (this.state === State.PAUSED) {
        this.checkpoint = this.timestamp;
      }
      return;
    }
    if (this.state !== State.ONGOING) return;

    switch (this.sport) {
      case "football":
        if (k === '1') { this.tryScore = 1; this.addActionMessage("Goal!", 4000); }
        else if (k === 'A') { this.passKick = 1; this.addActionMessage("Pass", 500); }
        break;
      case "AFL":
        if (k === '1') { this.tryScore = 1; this.addActionMessage("Goal", 4000); }
        else if (k === '2') { this.conversion = 1; this.addActionMessage("Behind", 2000); }
        else if (k === 'A') { this.passKick = 1; this.addActionMessage("Pass", 500); }
        else if (k === 'D') { this.ruck = 1; this.addActionMessage("Mark", 500); }
        break;
      case "rugby":
        if (k === '1') { this.tryScore = 1; this.addActionMessage("Try", 4000); }
        else if (k === '2') { this.conversion = 1; this.addActionMessage("Conversion", 2000); }
        else if (k === 'A') { this.passKick = 1; this.addActionMessage("Pass", 500); }
        else if (k === 'D') { this.ruck = 1; this.addActionMessage("Ruck", 500); }
        else if (k === 'F') {
          if (!this.scrumFreeze && this.scrumMaul === 0) {
            this.scrumMaul = 1;
            this.timestamp = (millis() / 1000.0) - this.checkpoint;
            let scrumStr = this.toJsonRequest();
            if (scrumStr) {
              let msgObj = JSON.parse(scrumStr);
              if (msgObj.action) {
                this.sentMessages.push(msgObj);
                webSendJson(scrumStr);
                this.addActionMessage("Scrum", 6000);
              }
            }
            this.scrumFreeze = true;
            this.scrumStartTime = millis();
          }
        }
        break;
    }
  }

  handleMousePressed(event) {
    if (event.button === 0) {
      this.possession = (this.possession === POSSESSION_HOME) ? POSSESSION_AWAY : POSSESSION_HOME;
    }
    if (event.button === 4) {
      this.passKick = 1;
      this.addActionMessage("Pass", 500);
    }
  }

  start() {
    this.state = State.PAUSED;
    webConnect(this.url);
  }

  finish() {
    this.state = State.FINISHED;
    webDisconnect();
  }
}

//////////////////////////////
// Main Menu
//////////////////////////////

class MainPage extends Page {
  constructor() {
    super();
    this.font = myFont;
    this.background = backgroundImg;
    this.startButton = null;
    this.stadiumList = null;
    this.modeList = null;
    this.initGUI();
  }

  initGUI() {
    // Mode selector
    this.modeList = createSelect();
    this.modeList.parent('ui-container');
    this.modeList.class('custom-dropdown');
    let modePlaceholder = createElement('option', 'Select Mode');
    modePlaceholder.attribute('disabled', '');
    modePlaceholder.parent(this.modeList);
    this.modeList.option('Live Tracker Mode', 'live');
    this.modeList.option('Rugby Playback Mode', 'rugbyPlayback');
    this.modeList.option('Soccer Playback Mode', 'soccerPlayback');
    this.modeList.option('AFL Playback Mode', 'aflPlayback');
    this.modeList.changed(() => {
      selectedMode = this.modeList.value();
      if (selectedMode === 'live') currentPage = mainMenu;
      else if (selectedMode === 'rugbyPlayback') {
        currentPage = playbackMenuRugby;
      }
      else if (selectedMode === 'soccerPlayback') {
        currentPage = playbackMenuSoccer;
      }
      else if (selectedMode === 'aflPlayback') {
        // Check password for AFL playback mode
        const password = prompt('Please enter your password:');
        if (password !== 'marvel') {
          alert('Incorrect password. Access denied.');
          // Reset to default mode (live)
          this.modeList.value('live');
          selectedMode = 'live';
          currentPage = mainMenu;
        } else {
          currentPage = playbackMenuAFL;
        }
      }
      currentPage.show();
    });
    this.controllers.push(this.modeList);

    // Stadium selector
    this.stadiumList = createSelect();
    this.stadiumList.parent('ui-container');
    this.stadiumList.class('custom-dropdown');
    let placeholderOption = createElement('option', LIST_LABEL);
    placeholderOption.attribute('disabled', '');
    placeholderOption.parent(this.stadiumList);
    for (let i = 0; i < stadiums.length; i++) {
      this.stadiumList.option(stadiums[i], i);
    }
    this.stadiumList.changed(() => this.onClickList());
    this.controllers.push(this.stadiumList);

    // Default stadium
    this.stadiumList.value(0);
    this.onSelectStadium(0);

    // Start button
    this.startButton = createButton(START_LABEL);
    this.startButton.parent('ui-container');
    this.startButton.class('start-button');
    this.startButton.mousePressed(() => this.onClickStart());
    this.controllers.push(this.startButton);
  }

  onClickStart() {
    if (selectedMode === 'live') {
      game.start();
      currentPage = game;
    } else if (selectedMode === 'rugbyPlayback') {
      currentPage = playbackMenuRugby;
    } else if (selectedMode === 'soccerPlayback') {
      currentPage = playbackMenuSoccer;
    } else if (selectedMode === 'aflPlayback') {
      currentPage = playbackMenuAFL;
    }
    currentPage.show();
  }

  onClickList() {
    const selectedValue = this.stadiumList.value();
    if (selectedValue >= 0) this.onSelectStadium(parseInt(selectedValue));
  }

  onSelectStadium(selectedStadium) {
    const stadiumName = stadiums[selectedStadium];
    
    // Check if Marvel Stadium requires password
    if (selectedStadium === 1 && stadiumName === 'Marvel Stadium') {
      const password = prompt('Please enter your password:');
      if (password !== 'marvel') {
        alert('Incorrect password. Access denied.');
        // Reset to default stadium (Demonstration)
        this.stadiumList.value(0);
        this.onSelectStadium(0);
        return;
      }
      // Password correct, proceed with Marvel Stadium setup below
    }
    
    let url = null;
    let imgIndex = 0;
    switch (selectedStadium) {
      case 0:
        url = DALYMOUNT_PARK; imgIndex = 0; break;
      case 1:
        url = MARVEL_STADIUM;  imgIndex = 1; break;
      case 2:
      case 3:
        url = DALYMOUNT_PARK; imgIndex = 0; break;
      case 4:
        url = DALYMOUNT_PARK; imgIndex = 3; break;
      case 5:
        url = DUBLIN;         imgIndex = 3; break;
      case 6:
        url = DALYMOUNT_PARK; imgIndex = 0; break;
    }
    if (game) game.setStadium(url, stadiumName, imgIndex);
  }

  show() {
    super.show();
    if (this.background) background(this.background);
  }
}

//////////////////////////////
// PlaybackMenu for Rugby
//////////////////////////////

class PlaybackMenuRugby extends Page {
  constructor() {
    super();
    this.background = playbackBgRugby;
    this.zones = [
      {
        xFrac: 235 / 1200, yFrac: 219 / 800,
        wFrac: 286 / 1200, hFrac: 262 / 800,
        matchNum: 1,
        hoverBg: playbackBgMatch1Rugby
      },
      {
        xFrac: 673 / 1200, yFrac: 219 / 800,
        wFrac: 286 / 1200, hFrac: 262 / 800,
        matchNum: 2,
        hoverBg: playbackBgMatch2Rugby
      },
      {
        xFrac: 235 / 1200, yFrac: 510 / 800,
        wFrac: 286 / 1200, hFrac: 262 / 800,
        matchNum: 3,
        hoverBg: playbackBgMatch3Rugby
      },
      {
        xFrac: 673 / 1200, yFrac: 510 / 800,
        wFrac: 286 / 1200, hFrac: 262 / 800,
        matchNum: 4,
        hoverBg: playbackBgMatch4Rugby
      },
    ];
  }

  show() {
    super.show();
    let fx = mouseX / width, fy = mouseY / height;
    let currentBg = this.background;
    let hoveringZone = false;
    for (let zone of this.zones) {
      if (fx >= zone.xFrac && fx <= zone.xFrac + zone.wFrac &&
          fy >= zone.yFrac && fy <= zone.yFrac + zone.hFrac) {
        currentBg = zone.hoverBg;
        hoveringZone = true;
        break;
      }
    }
    image(currentBg, 0, 0, width, height);
    cursor(hoveringZone ? HAND : ARROW);
  }

  handleMousePressed(evt) {
    if (evt.button !== 0) return;
    let fx = mouseX / width, fy = mouseY / height;
    for (let zone of this.zones) {
      if (fx >= zone.xFrac && fx <= zone.xFrac + zone.wFrac &&
          fy >= zone.yFrac && fy <= zone.yFrac + zone.hFrac) {
        playbackMatchPageRugby.loadJSONFile(`data/match${zone.matchNum} rugby.json`);
        playbackMatchPageRugby.loadAudio(`data/match${zone.matchNum} rugby.mp3`);
        playbackMatchPageRugby.startInPause();
        currentPage = playbackMatchPageRugby;
        break;
      }
    }
  }
}

//////////////////////////////
// PlaybackMenu for Soccer
//////////////////////////////

class PlaybackMenuSoccer extends Page {
  constructor() {
    super();
    this.background = playbackBgSoccer;
    this.zones = [
      {
        xFrac: 235 / 1200, yFrac: 219 / 800,
        wFrac: 286 / 1200, hFrac: 262 / 800,
        matchNum: 1,
        hoverBg: playbackBgMatch1Soccer
      },
      {
        xFrac: 673 / 1200, yFrac: 219 / 800,
        wFrac: 286 / 1200, hFrac: 262 / 800,
        matchNum: 2,
        hoverBg: playbackBgMatch2Soccer
      },
      {
        xFrac: 235 / 1200, yFrac: 510 / 800,
        wFrac: 286 / 1200, hFrac: 262 / 800,
        matchNum: 3,
        hoverBg: playbackBgMatch3Soccer
      },
      {
        xFrac: 673 / 1200, yFrac: 510 / 800,
        wFrac: 286 / 1200, hFrac: 262 / 800,
        matchNum: 4,
        hoverBg: playbackBgMatch4Soccer
      },
    ];
  }

  show() {
    super.show();
    let fx = mouseX / width, fy = mouseY / height;
    let currentBg = this.background;
    let hoveringZone = false;
    for (let zone of this.zones) {
      if (fx >= zone.xFrac && fx <= zone.xFrac + zone.wFrac &&
          fy >= zone.yFrac && fy <= zone.yFrac + zone.hFrac) {
        currentBg = zone.hoverBg;
        hoveringZone = true;
        break;
      }
    }
    image(currentBg, 0, 0, width, height);
    cursor(hoveringZone ? HAND : ARROW);
  }

  handleMousePressed(evt) {
    if (evt.button !== 0) return;
    let fx = mouseX / width, fy = mouseY / height;
    for (let zone of this.zones) {
      if (fx >= zone.xFrac && fx <= zone.xFrac + zone.wFrac &&
          fy >= zone.yFrac && fy <= zone.yFrac + zone.hFrac) {
        playbackMatchPageSoccer.loadJSONFile(`data/match${zone.matchNum} soccer.json`);
        playbackMatchPageSoccer.loadAudio(`data/match${zone.matchNum} soccer.mp3`);
        playbackMatchPageSoccer.startInPause();
        currentPage = playbackMatchPageSoccer;
        break;
      }
    }
  }
}

//////////////////////////////
// PlaybackMenu for AFL
//////////////////////////////

class PlaybackMenuAFL extends Page {
  constructor() {
    super();
    this.background = playbackBgAFL;
    this.zones = [
      // Left image + text zone (Dom Sheed)
      {
        xFrac: 0.15, yFrac: 0.3,     // Start at 15% from left, 30% from top
        wFrac: 0.3, hFrac: 0.35,     // Cover 30% width, 35% height
        matchNum: 1,
        hoverBg: playbackBgMatch1AFL
      },
      // Right image + text zone (Bontempelli)
      {
        xFrac: 0.55, yFrac: 0.3,     // Start at 55% from left, 30% from top
        wFrac: 0.3, hFrac: 0.35,     // Cover 30% width, 35% height
        matchNum: 2,
        hoverBg: playbackBgMatch2AFL
      },
      // Bottom tutorial button zone
      {
        xFrac: 0.35, yFrac: 0.7,     // Start at 35% from left, 70% from top
        wFrac: 0.3, hFrac: 0.15,     // Cover 30% width, 15% height
        matchNum: 3,
        hoverBg: playbackBgMatch3AFL
      }
    ];
  }

  show() {
    super.show();
    let fx = mouseX / width;
    let fy = mouseY / height;
    let currentBg = this.background;
    let hoveringZone = false;

    // Check if mouse is over any zone
    for (let zone of this.zones) {
      if (fx >= zone.xFrac && fx <= zone.xFrac + zone.wFrac &&
          fy >= zone.yFrac && fy <= zone.yFrac + zone.hFrac) {
        currentBg = zone.hoverBg;
        hoveringZone = true;
        break;
      }
    }

    // Draw the current background
    image(currentBg, 0, 0, width, height);
    cursor(hoveringZone ? HAND : ARROW);
  }

  handleMousePressed(evt) {
    if (evt.button !== 0) return;
    let fx = mouseX / width;
    let fy = mouseY / height;
    
    for (let zone of this.zones) {
      if (fx >= zone.xFrac && fx <= zone.xFrac + zone.wFrac &&
          fy >= zone.yFrac && fy <= zone.yFrac + zone.hFrac) {
        playbackMatchPageAFL.loadJSONFile(`data/match${zone.matchNum} afl.json`);
        playbackMatchPageAFL.loadAudio(`data/match${zone.matchNum} afl.mp3`);
        playbackMatchPageAFL.startInPause();
        currentPage = playbackMatchPageAFL;
        break;
      }
    }
  }
}

//////////////////////////////
// PlaybackMatchPage (Rugby)
//////////////////////////////

class PlaybackMatchPageRugby extends Page {
  constructor() {
    super();
    this.selectedImageIndex = 3; // rugby pitch
    this.sport = 'rugby';
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
        action: 'dublin_IRL_sendMessage',
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
    webConnect(DUBLIN);
  }

  addActionMessage(msg, duration) {
    this.actionMessages.push({ text: msg, expire: millis() + duration });
  }

  show() {
    super.show();
    image(images[this.selectedImageIndex], 0, 0, 1200, 800);

    const imgSize = 65;
    if (this.possession === POSSESSION_HOME) {
      image(ballRugbyHome, this.ballX - imgSize / 2, this.ballY - imgSize / 2, imgSize, imgSize);
    } else {
      image(ballRugbyAway, this.ballX - imgSize / 2, this.ballY - imgSize / 2, imgSize, imgSize);
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
    if (msg.Pa === 1) this.addActionMessage("Pass", 500);
    if (msg.G === 1) this.addActionMessage("Try", 4000);
    if (msg.C === 1) this.addActionMessage("Conversion", 2000);
    if (msg.R === 1) this.addActionMessage("Ruck", 500);
    if (msg.S === 1) this.addActionMessage("Scrum", 1000);

    let playbackMsg = {
      action: 'dublin_IRL_sendMessage',
      message: { ...msg }
    };
    webSendJson(JSON.stringify(playbackMsg));
  }

  onKeyPressed() {
    if (keyCode === ESCAPE) {
      if (this.audio) this.audio.stop();
      this.isPaused = true;
      this.hasStarted = false;
      currentPage = playbackMenuRugby;
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
// PlaybackMatchPage (Soccer)
//////////////////////////////

class PlaybackMatchPageSoccer extends Page {
  constructor() {
    super();
    this.selectedImageIndex = 0; // football pitch
    this.sport = 'football';
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
    webConnect(DALYMOUNT_PARK);
  }

  addActionMessage(msg, duration) {
    this.actionMessages.push({ text: msg, expire: millis() + duration });
  }

  show() {
    super.show();
    image(images[this.selectedImageIndex], 0, 0, 1200, 800);

    const imgSize = 65;
    if (this.possession === POSSESSION_HOME) {
      image(ballFootballHome, this.ballX - imgSize / 2, this.ballY - imgSize / 2, imgSize, imgSize);
    } else {
      image(ballFootballAway, this.ballX - imgSize / 2, this.ballY - imgSize / 2, imgSize, imgSize + 10);
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
    if (msg.Pa === 1) this.addActionMessage("Pass", 500);
    if (msg.G === 1) this.addActionMessage("Goal!", 4000);
    if (msg.C === 1) this.addActionMessage("Conversion", 2000);
    if (msg.R === 1) this.addActionMessage("Ruck", 500);
    if (msg.S === 1) this.addActionMessage("Scrum", 1000);

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
      currentPage = playbackMenuSoccer;
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
// PlaybackMatchPage (AFL) - Optimized for smooth video playback
// Video jitter improvements:
// - Reduced canvas frame rate from 60fps to 30fps for better video sync
// - Cached video dimension calculations
// - Frame skipping to avoid redundant rendering
// - Optimized canvas context settings for video performance
// - Improved video element attributes for smoother playback
// - Conditional overlay rendering to reduce draw calls
//////////////////////////////

class PlaybackMatchPageAFL extends Page {
  constructor() {
    super();
    this.selectedImageIndex = 1; // afl pitch
    this.sport = 'AFL';
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
    this.video = null;
    this.hasVideo = false;
    this.videoDelayStarted = false;
    this.isLooping = false;
    this.loopWaitStartTime = 0;
    this.homingComplete = false;
    
    // Video optimization properties
    this.lastVideoFrame = -1;
    this.videoBuffer = null;
    this.videoDimensions = { drawWidth: 0, drawHeight: 0, offsetX: 0, offsetY: 0 };
    this.dimensionsCalculated = false;
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
    
    // Try to load corresponding video file
    const videoPath = audioPath.replace('.mp3', '.mp4');
    this.loadVideo(videoPath);
  }

  loadVideo(videoPath) {
    if (this.video) {
      this.video.stop();
      this.video = null;
    }
    this.hasVideo = false;
    this.dimensionsCalculated = false;
    this.lastVideoFrame = -1;
    
    // Try to load the video file
    this.video = createVideo(videoPath, () => {
      this.hasVideo = true;
      this.video.volume(0); // Mute video since we have separate audio
      this.video.hide(); // Hide the default video element
      
      // Optimize video playback
      this.video.elt.preload = 'auto';
      this.video.elt.playsinline = true;
      this.video.elt.muted = true;
      
      // Add video optimization attributes
      if (this.video.elt.style) {
        this.video.elt.style.imageRendering = 'optimizeSpeed';
        this.video.elt.style.imageRendering = 'crisp-edges';
      }
    });
    
    // Handle video load error
    this.video.elt.onerror = () => {
      this.hasVideo = false;
      this.video = null;
    };
  }

  startInPause() {
    this.isPaused = true;
    this.hasStarted = false;
    this.counter = 0;
    this.totalPausedDuration = 0;
    this.startPlaybackTime = millis();
    this.videoDelayStarted = false;
    this.isLooping = false;
    this.homingComplete = false;
    this.lastVideoFrame = -1;
    webConnect(MARVEL_STADIUM);
  }

  addActionMessage(msg, duration) {
    this.actionMessages.push({ text: msg, expire: millis() + duration });
  }

  show() {
    super.show();
    
    // Check if playback is complete and handle looping
    if (!this.isPaused && this.hasStarted && this.counter >= this.jsonSize && !this.isLooping) {
      this.startLooping();
    }
    
    // Handle looping wait period (ball returns home and waits)
    if (this.isLooping) {
      let waitTime = millis() - this.loopWaitStartTime;
      if (waitTime >= 3000) { // Wait 3 seconds total (1s for homing + 2s pause)
        this.restartPlayback();
      } else if (waitTime >= 1000) {
        this.homingComplete = true;
      }
    }
    
    // Handle video delay (start video 0.5 seconds after audio)
    if (this.hasVideo && this.video && !this.isPaused && this.hasStarted && !this.isLooping) {
      let currentTime = (millis() - this.startPlaybackTime - this.totalPausedDuration) / 1000.0;
      if (currentTime >= 0.5 && !this.videoDelayStarted) {
        this.video.play();
        this.videoDelayStarted = true;
      }
    }
    
    // Display video cropped if available and delay has passed, otherwise show pitch with ball
    if (this.hasVideo && this.video && !this.isPaused && this.videoDelayStarted && !this.isLooping) {
      // Display video cropped to fit app dimensions
      this.drawCroppedVideo();
      // Display video overlay on top of video (only when video is playing)
      if (this.video && !this.video.elt.paused && videoOverlayImg) {
        tint(255, 255); // Ensure full opacity
        image(videoOverlayImg, 0, 0, 1200, 800);
        noTint();
      }
    } else {
      // Display pitch with ball tracking
      image(images[this.selectedImageIndex], 0, 0, 1200, 800);

      // Show ball position during looping/homing
      if (this.isLooping) {
        if (!this.homingComplete) {
          // Ball moving back to home position
          this.animateHomeBall();
        }
        // During homing and wait, keep showing the ball at home position
        let homeX = this.jsonSize > 0 ? this.jsonArray[0].message.X * (appWidth / 102) : appWidth / 2;
        let homeY = this.jsonSize > 0 ? this.jsonArray[0].message.Y * (appHeight / 64) : appHeight / 2;
        let homePossession = this.jsonSize > 0 ? this.jsonArray[0].message.P : POSSESSION_HOME;
        
        const imgSize = 65;
        if (homePossession === POSSESSION_HOME) {
          image(ballAFLHome, homeX - imgSize / 2, homeY - imgSize / 2, imgSize, imgSize);
        } else {
          image(ballAFLAway, homeX - imgSize / 2, homeY - imgSize / 2, imgSize, imgSize);
        }
      } else {
        // Normal ball tracking
        const imgSize = 65;
        if (this.possession === POSSESSION_HOME) {
          image(ballAFLHome, this.ballX - imgSize / 2, this.ballY - imgSize / 2, imgSize, imgSize);
        } else {
          image(ballAFLAway, this.ballX - imgSize / 2, this.ballY - imgSize / 2, imgSize, imgSize);
        }
      }
    }

    // Show pause overlay during initial delay or when actually paused or during looping
    if (this.isPaused || (this.hasStarted && !this.videoDelayStarted && !this.isLooping) || this.isLooping) {
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

  calculateVideoDimensions() {
    if (!this.video || this.dimensionsCalculated) return;
    
    let videoAspect = this.video.width / this.video.height;
    let appAspect = appWidth / appHeight;
    
    if (videoAspect > appAspect) {
      // Video is wider - crop sides
      this.videoDimensions.drawHeight = appHeight;
      this.videoDimensions.drawWidth = appHeight * videoAspect;
      this.videoDimensions.offsetX = (appWidth - this.videoDimensions.drawWidth) / 2;
      this.videoDimensions.offsetY = 0;
    } else {
      // Video is taller - crop top/bottom
      this.videoDimensions.drawWidth = appWidth;
      this.videoDimensions.drawHeight = appWidth / videoAspect;
      this.videoDimensions.offsetX = 0;
      this.videoDimensions.offsetY = (appHeight - this.videoDimensions.drawHeight) / 2;
    }
    
    this.dimensionsCalculated = true;
  }

  drawCroppedVideo() {
    if (!this.video) return;
    
    // Calculate dimensions only once
    this.calculateVideoDimensions();
    
    // Skip if video hasn't updated
    let currentFrame = this.video.time();
    if (currentFrame === this.lastVideoFrame) return;
    this.lastVideoFrame = currentFrame;
    
    push();
    // Use faster rendering mode
    imageMode(CORNER);
    
    let {drawWidth, drawHeight, offsetX, offsetY} = this.videoDimensions;
    
    // Use optimized scaling and cropping
    if (offsetX < 0) {
      // Video is wider - crop horizontally
      let sourceX = Math.abs(offsetX) * (this.video.width / drawWidth);
      let sourceW = appWidth * (this.video.width / drawWidth);
      copy(this.video, sourceX, 0, sourceW, this.video.height, 0, 0, appWidth, appHeight);
    } else if (offsetY < 0) {
      // Video is taller - crop vertically
      let sourceY = Math.abs(offsetY) * (this.video.height / drawHeight);
      let sourceH = appHeight * (this.video.height / drawHeight);
      copy(this.video, 0, sourceY, this.video.width, sourceH, 0, 0, appWidth, appHeight);
    } else {
      // No cropping needed, just scale
      image(this.video, offsetX, offsetY, drawWidth, drawHeight);
    }
    
    pop();
  }

  startLooping() {
    this.isLooping = true;
    this.loopWaitStartTime = millis();
    this.homingComplete = false;
    if (this.audio) this.audio.stop();
    if (this.video && this.hasVideo) this.video.stop();
  }

  restartPlayback() {
    this.isLooping = false;
    this.counter = 0;
    this.totalPausedDuration = 0;
    this.startPlaybackTime = millis();
    this.videoDelayStarted = false;
    this.homingComplete = false;
    this.lastVideoFrame = -1;
    
    // Reset ball to home position
    if (this.jsonSize > 0 && this.jsonArray[0].message) {
      this.setBallTo(this.jsonArray[0].message);
    }
    
    // Restart audio and video
    if (this.audio) {
      this.audio.stop();
      this.audio.play(0);
    }
    // Video will start with delay automatically
  }

  animateHomeBall() {
    if (this.jsonSize === 0) return;
    
    let homeX = this.jsonArray[0].message.X * (appWidth / 102);
    let homeY = this.jsonArray[0].message.Y * (appHeight / 64);
    
    let progress = (millis() - this.loopWaitStartTime) / 1000.0; // 1 second to get home
    progress = Math.min(progress, 1.0);
    
    // Smooth animation back to home
    this.ballX = lerp(this.ballX, homeX, progress);
    this.ballY = lerp(this.ballY, homeY, progress);
    this.possession = this.jsonArray[0].message.P;
  }

  processEntry(msg) {
    this.setBallTo(msg);
    if (msg.Pa === 1) this.addActionMessage("Pass", 500);
    if (msg.G === 1) this.addActionMessage("Goal", 4000);
    if (msg.C === 1) this.addActionMessage("Behind", 2000);
    if (msg.R === 1) this.addActionMessage("Mark", 500);

    // Send to Marvel Stadium (AUS)
    let playbackMsgAUS = {
      action: 'marvel_AUS_sendMessage',
      message: { ...msg }
    };
    webSendJson(JSON.stringify(playbackMsgAUS));
  }

  onKeyPressed() {
    if (keyCode === ESCAPE) {
      if (this.audio) this.audio.stop();
      if (this.video && this.hasVideo) this.video.stop();
      this.isPaused = true;
      this.hasStarted = false;
      this.videoDelayStarted = false;
      this.isLooping = false;
      currentPage = playbackMenuAFL;
      return;
    }
    if (key === 'r' || key === 'R') {
      this.counter = 0;
      this.totalPausedDuration = 0;
      this.startPlaybackTime = millis();
      this.isPaused = true;
      this.hasStarted = false;
      this.videoDelayStarted = false;
      this.isLooping = false;
      this.homingComplete = false;
      if (this.audio) this.audio.stop();
      if (this.video && this.hasVideo) this.video.stop();
      return;
    }
    if (key === ' ') {
      // Don't allow pause/play during looping
      if (this.isLooping) return;
      
      if (this.isPaused) {
        if (!this.hasStarted) {
          this.hasStarted = true;
          this.counter = 0;
          this.totalPausedDuration = 0;
          this.startPlaybackTime = millis();
          this.videoDelayStarted = false;
          this.isLooping = false;
          this.homingComplete = false;
          if (this.audio) { this.audio.stop(); this.audio.play(0); }
          // Video will start automatically with 0.5s delay in show() method
        } else {
          this.totalPausedDuration += millis() - this.pauseStartTime;
          if (this.audio) this.audio.play();
          if (this.video && this.hasVideo && this.videoDelayStarted) this.video.play();
        }
        this.isPaused = false;
      } else {
        this.pauseStartTime = millis();
        if (this.audio) this.audio.pause();
        if (this.video && this.hasVideo) this.video.pause();
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
  // Send immediately if socket is open
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(json);
  } else {
    // Otherwise queue until open
    requests.push(json);
  }
}

function webThread() {
  // Flush any queued messages quickly once socket is open
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

function setup() {
  const cnv = createCanvas(appWidth, appHeight);
  cnv.parent('canvas-container');
  // Remove willReadFrequently option for better video performance
  cnv.elt.getContext('2d', { 
    alpha: false,
    desynchronized: true,
    powerPreference: "high-performance"
  });

  game                   = new Game();
  mainMenu               = new MainPage();
  playbackMenuRugby      = new PlaybackMenuRugby();
  playbackMenuSoccer     = new PlaybackMenuSoccer();
  playbackMenuAFL        = new PlaybackMenuAFL();
  playbackMatchPageRugby = new PlaybackMatchPageRugby();
  playbackMatchPageSoccer = new PlaybackMatchPageSoccer();
  playbackMatchPageAFL   = new PlaybackMatchPageAFL();

  addPages(
    game,
    mainMenu,
    playbackMenuRugby,
    playbackMenuSoccer,
    playbackMenuAFL,
    playbackMatchPageRugby,
    playbackMatchPageSoccer,
    playbackMatchPageAFL
  );

  currentPage = mainMenu;
  currentPage.show();

  frameRate(30); // Reduced from 60fps to 30fps for smoother video playback
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
  if (event.button === 4 || event.button === 2 || event.button === 3) {
    event.preventDefault();
  }
}

function preload() {
  // Font
  myFont = loadFont('assets/arial.ttf');

  // Main menu background
  backgroundImg = loadImage('images/background.webp');

  // Video overlay
  videoOverlayImg = loadImage('images/video overlay.png');

  // Playback pause overlay
  playbackPauseImg = loadImage('images/playback pause.webp');

  // Pitches
  images[0] = loadImage('images/football pitch.webp');  // Soccer/Football
  images[1] = loadImage('images/afl pitch.webp');       // AFL
  images[2] = loadImage('images/football pitch.webp');  // Another soccer if needed
  images[3] = loadImage('images/rugby pitch.webp');     // Rugby

  // Pause images
  paused = loadImage('images/football pause.webp');
  rugbyPaused = loadImage('images/rugby pause.webp');
  aflPaused = loadImage('images/afl pause.webp');

  // Ball images
  ballFootballHome = loadImage('images/football home.webp');
  ballFootballAway = loadImage('images/football away.webp');
  ballAFLHome = loadImage('images/afl home.webp');
  ballAFLAway = loadImage('images/afl away.webp');
  ballRugbyHome = loadImage('images/rugby home.webp');
  ballRugbyAway = loadImage('images/rugby away.webp');

  // Rugby playback backgrounds
  playbackBgRugby = loadImage('images/playback background rugby.webp');
  playbackBgMatch1Rugby = loadImage('images/playback background match1 rugby.webp');
  playbackBgMatch2Rugby = loadImage('images/playback background match2 rugby.webp');
  playbackBgMatch3Rugby = loadImage('images/playback background match3 rugby.webp');
  playbackBgMatch4Rugby = loadImage('images/playback background match4 rugby.webp');

  // Soccer playback backgrounds
  playbackBgSoccer = loadImage('images/playback background soccer.webp');
  playbackBgMatch1Soccer = loadImage('images/playback background match1 soccer.webp');
  playbackBgMatch2Soccer = loadImage('images/playback background match2 soccer.webp');
  playbackBgMatch3Soccer = loadImage('images/playback background match3 soccer.webp');
  playbackBgMatch4Soccer = loadImage('images/playback background match4 soccer.webp');

  // AFL playback backgrounds
  playbackBgAFL = loadImage('images/playback background afl.webp');
  playbackBgMatch1AFL = loadImage('images/playback background match1 afl.webp');
  playbackBgMatch2AFL = loadImage('images/playback background match2 afl.webp');
  playbackBgMatch3AFL = loadImage('images/playback background match3 afl.webp');
}
