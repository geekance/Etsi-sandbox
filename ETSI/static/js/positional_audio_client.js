Demo = function(setup) {
  if (setup != null) {
    for (var i in setup) {
      this[i] = setup[i];
    }
  }
  var self = this;
  this.ticker = function(t) {
    self.tick(t);
    window.requestAnimationFrame(self.ticker, self.renderer.domElement);
  };
  this.resizer = function(ev) {
    self.resize(window.innerWidth, window.innerHeight);
  };

  if (window !== top) {
    this.startButton = document.createElement('button');
    document.body.appendChild(this.startButton);
    this.startButton.style.position = 'absolute';
    this.startButton.style.zIndex = 10;
    this.startButton.textContent = "Start Demo";
    this.startButton.onclick = function() {
      var frames = window.parent.frames,
        scripts, reload;
      for (var i = 0, il = frames.length; i < il; i++) {
        if (frames[i] === window || !frames[i].document) {
          continue;
        }
        scripts = frames[i].document.getElementsByTagName('script');
        reload = false;
        for (var j = 0, jl = scripts.length; j < jl; j++) {
          if (scripts[j].src.indexOf('positional_audio.js') !== -1) {
            reload = true;
            break;
          }
        }
        if (reload) {
          frames[i].document.location.reload();
        }
      }
      if (!self.playing) {
        if (!self.initComplete) {
          self.init();
        }
        self.startButton.textContent = "Stop Demo";
        self.play();
      } else {
        self.startButton.textContent = "Start Demo";
        self.stop();
      }
    };
  } else {

    this.init();
    this.play();
  }
};

Demo.prototype = {
  previousTime: 0,
  maxTimeDelta: 60,
  playing: false,

  positionEnabled: true,
  velocityEnabled: true,
  orientationEnabled: true,
  environmentEnabled: true,
  userId: null,
  initComplete: false,
  updateSounds: false,
  numberOfUsers: 0,
  users: new Object(),
  sounds: new Object(),
  socket: 0,
  alpha: null,
  beta: null,
  gamma: null,

  init: function() {
    this.initComplete = true;
    this.setupRenderer();
    this.setupCamera();
    this.setupScene();
    this.setupObjects();
  },

  readSessionUsers: function() {
    this.sounds = [];
    readXMLSessionUsers(this.sounds);
    // console.log(this.sounds);
    if (this.numberOfUsers != this.sounds.length) {
      this.updateSounds = true;
    }
    this.numberOfUsers = this.sounds.length;
    // console.log(this.numberOfUsers);
  },

  setupRenderer: function() {
    this.renderer = new THREE.WebGLRenderer();
    this.listenToResize();

    var s = this.renderer.domElement.style;
    s.position = 'absolute';
    s.left = s.top = '0px';
    document.body.appendChild(this.renderer.domElement);
  },

  listenToResize: function() {
    window.addEventListener('resize', this.resizer, false);
    this.resizer();
  },

  resize: function(w, h) {
    this.width = w;
    this.height = h;
    this.renderer.setSize(this.width, this.height);
  },

  play: function() {
    this.playing = true;
    window.requestAnimationFrame(this.ticker, this.renderer.domElement);
    this.audio.volume.connect(this.audio.context.destination);
  },

  mute: function() {
    this.audio.volume.gain.value = 0;
  },

  unmute: function() {
    this.audio.volume.gain.value = 1;
  },

  stop: function() {
    this.playing = false;
    this.audio.volume.disconnect();
  },

  tick: function(t) {
    if (!this.playing) {
      return;
    }
    var dt = Math.min(t - this.previousTime, this.maxTimeDelta);
    this.previousTime = t;
    this.update(t, dt);
    this.draw(t, dt);
  },

  draw: function(t, dt) {
    this.renderer.render(this.scene, this.camera);
  },

  setupScene: function() {
    this.scene = new THREE.Scene();
    this.scene.add(this.camera);
  },

  setupAudio: function() {
    var a = {};
    this.audio = a;

    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    a.context = new AudioContext();
    a.convolver = a.context.createConvolver();
    a.volume = a.context.createGain();

    a.mixer = a.context.createGain();

    a.flatGain = a.context.createGain();
    a.convolverGain = a.context.createGain();

    a.destination = a.mixer;
    a.mixer.connect(a.flatGain);
    //a.mixer.connect(a.convolver);
    a.convolver.connect(a.convolverGain);
    a.flatGain.connect(a.volume);
    a.convolverGain.connect(a.volume);
    a.volume.connect(a.context.destination);

    a.environments = {};
    if (this.environmentEnabled) {
      this.loadEnvironment('cathedral');
      this.loadEnvironment('filter-telephone');
      this.loadEnvironment('echo-chamber');
      this.loadEnvironment('bright-hall');
    }
  },

  setEnvironment: function(name) {
    if (this.audio.environments[name]) {
      var cg = 0.7,
        fg = 0.3;
      if (name.match(/^filter-/)) {
        cg = 1, fg = 0;
      }
      this.audio.convolverGain.gain.value = cg;
      this.audio.flatGain.gain.value = fg;
      this.audio.convolver.buffer = this.audio.environments[name];
    } else {
      this.audio.flatGain.gain.value = 1;
      this.audio.convolverGain.gain.value = 0;
    }
  },

  loadEnvironment: function(name) {
    var self = this;
    this.loadBuffer('impulse_responses/' + name + '.wav', function(buffer) {
      self.audio.environments[name] = buffer;
    });
  },

  loadBuffer: function(soundFileName, callback) {
    var request = new XMLHttpRequest();
    request.open("GET", soundFileName, true);
    request.responseType = "arraybuffer";
    var ctx = this.audio.context;
    request.onload = function() {
      ctx.decodeAudioData(request.response, callback, function() {
        alert("Decoding the audio buffer failed");
      });
    };
    request.send();
    return request;
  },

  loadSound: function(soundFileName) {
    var ctx = this.audio.context;

    var sound = {};
    sound.source = ctx.createBufferSource();
    sound.source.loop = true;
    sound.panner = ctx.createPanner();
    sound.volume = ctx.createGain();

    sound.source.connect(sound.volume);
    sound.volume.connect(sound.panner);
    sound.panner.connect(this.audio.destination);
    // if (getMobileOperatingSystem() == "iOS") {
    //   sound.source.start(0);
    // }
    this.loadBuffer(soundFileName, function(buffer) {
      sound.buffer = buffer;
      sound.source.buffer = sound.buffer;

      sound.source.start(ctx.currentTime + 0.020);

    });

    // delete ctx; 

    return sound;
  },

  setupCamera: function() {
    this.camera = new THREE.PerspectiveCamera(
      45, this.width / this.height, 0.01, 1000);
    this.camera.position.z = 8.00;
    this.camera.position.y = -0.50;
  },

  createSoundCone: function(object, innerAngle, outerAngle, outerGain) {
    var innerScale = 1,
      outerScale = 1;
    var ia = innerAngle;
    var oa = outerAngle;
    if (outerAngle > Math.PI) {
      oa = 2 * Math.PI - outerAngle;
      outerScale = -1;
    }
    if (innerAngle > Math.PI) {
      ia = 2 * Math.PI - innerAngle;
      innerScale = -1;
    }
    var height = 5;
    var innerRadius = Math.sin(ia / 2) * height;
    var innerHeight = Math.cos(ia / 2) * height;
    var outerRadius = Math.sin(oa / 2) * height * 0.9;
    var outerHeight = Math.cos(oa / 2) * height * 0.9;
    var innerConeGeo = new THREE.CylinderGeometry(0, innerRadius, innerHeight, 100, 1, true);
    var outerConeGeo = new THREE.CylinderGeometry(0, outerRadius, outerHeight, 100, 1, true);

    var innerCone = new THREE.Mesh(
      innerConeGeo,
      new THREE.MeshBasicMaterial({
        color: 0x00ff00,
        opacity: 0.5
      })
    );
    innerCone.material.side = THREE.DoubleSide;
    innerCone.material.transparent = true;
    innerCone.material.blending = THREE.AdditiveBlending;
    innerCone.material.depthWrite = false;
    innerCone.scale.y = innerScale;
    innerCone.position.y = -innerHeight / 2 * innerScale;
    var outerCone = new THREE.Mesh(
      outerConeGeo,
      new THREE.MeshBasicMaterial({
        color: 0xff0000,
        opacity: 0.5
      })
    );
    outerCone.material.side = THREE.DoubleSide;
    outerCone.material.transparent = true;
    outerCone.material.blending = THREE.AdditiveBlending;
    outerCone.material.depthWrite = false;
    outerCone.scale.y = outerScale;
    outerCone.position.y = -outerHeight / 2 * outerScale;

    var cones = new THREE.Object3D();
    cones.add(innerCone);
    cones.add(outerCone);
    cones.rotation.x = -Math.PI / 2;
    object.add(cones);

    object.sound.panner.coneInnerAngle = innerAngle * 180 / Math.PI;
    object.sound.panner.coneOuterAngle = outerAngle * 180 / Math.PI;
    object.sound.panner.coneOuterGain = outerGain;
  },

  newSound: function() {
    var sound = {
      "id": Object.keys(this.sounds).length,
      "x": 0,
      "y": -8,
      "z": randomInt(-30, 30),
      "directory": Object.keys(this.sounds).length + '.mp3'
    };

    this.sounds[sound.id] = sound;
    this.socket.emit('sendNewSound', sound, sound.id);
  },

  removeSound: function() {
    var id;
    for (var i in this.sounds) {
      id = this.sounds[i].id
    };

    delete this.sounds[id];
    // console.log(this.sounds);
    this.socket.emit('sendRemoveSound', this.sounds);
  },

  updateSounds: function() {

    if (this.updateSounds) {
      for (var i in this.sounds) {
        var sound = this.sounds[i];
        this.createSound(sound.x, sound.y, sound.z, sound.sound);
      }
    }

  },

  createSound: function(x, y, z, soundPath) {
    var soundGeo = new THREE.BoxGeometry(1.20, 1.20, 2.00);
    var soundMat = new THREE.MeshLambertMaterial({
      color: 0xFF0000
    });
    var sound = new THREE.Mesh(soundGeo, soundMat);
    this.scene.add(sound);

    sound.rotation.x = 4.7;
    sound.rotation.z = 0;

    sound.position.x = x;
    sound.position.y = y;
    sound.position.z = z;

    sound.sound = this.loadSound(soundPath);
    if (this.orientationEnabled) {
      this.createSoundCone(sound, 1.0, 3.8, 0.1);
    }
    this.setPosition(sound, x, y, z);

  },

  deleteSounds: function() {
    this.audio.context.close();
    // delete this.audio.context;

    for (var i = this.scene.children.length - 1; i >= 0; i--) {
      var object = this.scene.children[i];
      if (i > 2) {
        this.scene.remove(object);
      }

    }
  },

  hideScene: function() {

    for (var i = this.scene.children.length - 1; i >= 0; i--) {
      var object = this.scene.children[i];
      object.visible = false;

    }
  },

  setupObjects: function() {
    this.setupAudio();

    var light = new THREE.PointLight(0xFFFFFF);
    light.position.x = 4.00;
    light.position.y = 4.00;
    light.position.z = 4.00;
    this.light = light;
    this.scene.add(light);

    var plane = new THREE.Mesh(
      new THREE.PlaneBufferGeometry(20, 200, 20, 200),
      new THREE.MeshLambertMaterial({
        color: 0xffffff
      })
    );
    plane.position.y = -5.0;
    plane.rotation.x = -Math.PI / 2;
    this.scene.add(plane);

    this.keyForward = this.keyBackward = this.keyLeft = this.keyRight = false;
    var self = this;

    var down = false;
    var mx = 0,
      my = 0;
    this.camera.target = new THREE.Object3D();

    // window.addEventListener("deviceorientation", function(e) {
    //   self.alpha = e.alpha;
    //   self.beta = e.beta;
    //   self.gamma = e.gamma;

    //   self.xangle = radians(self.alpha);

    //   if (e.beta > 20) {
    //     self.keyBackward = true;
    //   } else {
    //     self.keyBackward = false;
    //   }
    //   if (e.beta < -20) {
    //     self.keyForward = true;
    //   } else {
    //     self.keyForward = false;
    //   }
    //   if (e.gamma > 20) {
    //     self.keyRight = true;
    //   } else {
    //     self.keyRight = false;
    //   }
    //   if (e.gamma < -20) {
    //     self.keyLeft = true;
    //   } else {
    //     self.keyLeft = false;
    //   }
    // }, false);


    window.addEventListener('mousedown', function(ev) {
      mx = ev.clientX;
      my = ev.clientY;
      down = true;
    }, false);

    window.addEventListener('mouseup', function() {
      down = false;
    }, false);
    this.xangle = Math.PI;
    this.yangle = 0;
    window.addEventListener('mousemove', function(ev) {
      if (down) {
        var dx = ev.clientX - mx;
        var dy = ev.clientY - my;
        mx = ev.clientX;
        my = ev.clientY;
        // console.log("ev.clientX: ", ev.clientX, " mx: ", mx, " dx = ev.clientX - mx: ", dx);
        self.xangle -= dx / 100;
        // self.yangle = Math.min(Math.PI/2, Math.max(-Math.PI/2, self.yangle-dy/100)); //CYM: removed for the cam to move only on x 
      }
    }, false);

    window.addEventListener('keydown', function(ev) {
      switch (ev.keyCode) {
        case 'W'.charCodeAt(0):
        case 38:
          self.keyForward = true;
          break;
        case 'S'.charCodeAt(0):
        case 40:
          self.keyBackward = true;
          break;
        case 'A'.charCodeAt(0):
        case 37:
          self.keyLeft = true;
          break;
        case 'D'.charCodeAt(0):
        case 39:
          self.keyRight = true;
          break;
      }
    }, false);

    window.addEventListener('keyup', function(ev) {
      switch (ev.keyCode) {
        case 'W'.charCodeAt(0):
        case 38:
          self.keyForward = false;
          break;
        case 'S'.charCodeAt(0):
        case 40:
          self.keyBackward = false;
          break;
        case 'A'.charCodeAt(0):
        case 37:
          self.keyLeft = false;
          break;
        case 'D'.charCodeAt(0):
        case 39:
          self.keyRight = false;
          break;
        case 'N'.charCodeAt(0):
          self.newSound();
          break;
        case 'R'.charCodeAt(0):
          self.removeSound();
          break;
      }
    }, false);

    window.addEventListener('blur', function(ev) {
      self.mute()
    }, false);
    window.addEventListener('focus', function(ev) {
      self.unmute()
    }, false);

    window.addEventListener('touchstart', function() {


      // for (var i = 0; i < self.users.length; i++) {
      //   var sound = self.users[i].probableFuture; 
      //   self.createSound(sound.x, sound.y, sound.z, sound.path);
      // };

    }, false);

    this.socket.on('emitUsers', function(users) {
      self.numberOfUsers = users.length;
      self.users = users;
      self.xangle = self.users[self.userId].angle;
      self.updateCameraTarget();
      self.camera.lookAt(self.camera.target.position);
      self.setListenerPosition(self.camera,
        users[self.userId].x,
        users[self.userId].y,
        users[self.userId].z,
        users[self.userId].dt / 1000);
    });

    this.socket.on('emitSounds', function(sounds) {
      self.deleteSounds();
      self.setupAudio();
      if (Object.keys(sounds).length != 0) {



        self.sounds = sounds;
        for (var i in self.sounds) {
          var sound = self.sounds[i];
          self.createSound(sound.x, sound.y, sound.z, sound.directory);
        }
      };
    });

    this.socket.emit('getUsers');
    this.socket.emit('getSounds');

  },

  updateCameraTarget: function() {
    var lx = Math.sin(this.xangle);
    var ly = Math.sin(this.yangle);
    var lz = Math.cos(this.xangle);
    this.camera.target.position.set(
      this.camera.position.x + lx,
      this.camera.position.y + ly,
      this.camera.position.z + lz
    );
  },

  setPositionAndVelocity: function(object, audioNode, x, y, z, dt) {
    var p = new THREE.Vector3();
    var q = new THREE.Vector3();
    p.setFromMatrixPosition(object.matrixWorld);
    var px = p.x,
      py = p.y,
      pz = p.z;
    object.position.set(x, y, z);
    object.updateMatrixWorld();
    q.setFromMatrixPosition(object.matrixWorld);
    var dx = q.x - px,
      dy = q.y - py,
      dz = q.z - pz;
    if (this.positionEnabled) {
      audioNode.setPosition(q.x, q.y, q.z);
    }
    if (this.velocityEnabled) {
      audioNode.setVelocity(dx / dt, dy / dt, dz / dt);
    }
  },

  setPosition: function(object, x, y, z, dt) {
    this.setPositionAndVelocity(object, object.sound.panner, x, y, z, dt);
    if (this.orientationEnabled) {
      var vec = new THREE.Vector3(0, 0, 1);
      var m = object.matrixWorld;
      var mx = m.elements[12],
        my = m.elements[13],
        mz = m.elements[14];
      m.elements[12] = m.elements[13] = m.elements[14] = 0;
      vec.applyProjection(m);
      vec.normalize();
      object.sound.panner.setOrientation(vec.x, vec.y, vec.z);
      m.elements[12] = mx;
      m.elements[13] = my;
      m.elements[14] = mz;
    }
  },

  setListenerPosition: function(object, x, y, z, dt) {
    this.setPositionAndVelocity(object, this.audio.context.listener, x, y, z, dt);
    if (this.orientationEnabled) {
      var m = object.matrix;
      var mx = m.elements[12],
        my = m.elements[13],
        mz = m.elements[14];
      m.elements[12] = m.elements[13] = m.elements[14] = 0;

      var vec = new THREE.Vector3(0, 0, 1);
      vec.applyProjection(m);
      vec.normalize();

      var up = new THREE.Vector3(0, -1, 0);
      up.applyProjection(m);
      up.normalize();

      this.audio.context.listener.setOrientation(vec.x, vec.y, vec.z, up.x, up.y, up.z);

      m.elements[12] = mx;
      m.elements[13] = my;
      m.elements[14] = mz;
    }
  },

  update: function(t, dt) {
    // client = "client" + this.clientId;
    // clientPosition = localStorage.getItem(client).split(',');
    // this.readSessionUsers();

    // if (this.updateSound)
    // {

    //   this.deletesound();
    //   this.setupAudio();
    //   for(var i in this.sounds){
    //     var sound = this.sounds[i]; 
    //     console.log(sound.sound);
    //     this.createSound(sound.x, sound.y, sound.z, sound.sound);
    //   }
    //   this.updatesound = false;
    //   // this.hideScene();

    // }
    var cp = this.camera.position;
    var camZ = cp.z,
      camX = cp.x,
      camY = cp.y;
    var vz = Math.cos(this.xangle);
    var vx = Math.sin(this.xangle);
    var speed = 1 / 60;
    if (this.keyForward) {
      camX += vx * dt * speed;
      camZ += vz * dt * speed;
    }
    if (this.keyBackward) {
      camX -= vx * dt * speed;
      camZ -= vz * dt * speed;
    }
    if (this.keyLeft) {
      camZ -= vx * dt * speed;
      camX -= -vz * dt * speed;
    }
    if (this.keyRight) {
      camZ += vx * dt * speed;
      camX += -vz * dt * speed;
    }

    if (Object.keys(this.users).length != 0) {
      this.users[this.userId].x = camX;
      this.users[this.userId].y = camY;
      this.users[this.userId].z = camZ;
      this.users[this.userId].angle = this.xangle;
      this.users[this.userId].dt = dt;

      this.socket.emit('sendUsers', this.users, this.userId);
    };

  }

};