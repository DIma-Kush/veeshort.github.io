var scene, camera, renderer;
var raycaster;
var mouse;
var frustumSize = 25;   // 42 - fit
var scrollSpeed = 0.15; // map scrolling speed
// DOM
// Map rotation buttons
var rBtnCw, rBtnCcw;
var container;
var labels = [];

var cameraScrollDirection = {
  left: false,
  right: false,
  top: false,
  bottom: false
};

var Textures = {
  list: {
    water_01: {
      path: '../assets/textures/terrain/water.jpg'
    },
    grass_01: {
      path: '../assets/textures/terrain/grass.png'
    },
    fort_01_f: {
      path: '../assets/textures/structures/fort_front.png'
    },
    fort_01_s: {
      path: '../assets/textures/structures/fort_side.png'
    },
    fort_01_t: {
      path: '../assets/textures/structures/fort_top.png'
    }
  },
  loadAll: function() {
    for (var i in this.list) {
      this.list[i]['texture'] = new THREE.TextureLoader()
      .load(this.list[i].path);
      this.list[i].texture.anisotropy = 1;
    }
  }
}

var Terrain = {
  map: [],
  group: null,
  pivot: null,
  width: 0,
  height: 0,
  tileSize: 2,
  rotation: {
    cw: false,
    ccw: false,
    targetAngle: null,
    baseAngle: null
  },
  generateMap: function(options) {
    this.width = options.width;
    this.height = options.height;
    map = new ROT.Map.Cellular(options.width, options.height);
    map.randomize(options.randomize);
    for (var i = 0; i < options.generations; i++) map.create();
    this.map = map['_map'];
  }
};

function toRad(deg) {
  return deg*Math.PI/180;
}
function toDeg(rad) {
  return rad*180/Math.PI;
}

function createScene() {
  scene = new THREE.Scene();

  var aspect = window.innerWidth/window.innerHeight;
  camera = new THREE.OrthographicCamera( frustumSize * aspect / - 2, frustumSize * aspect / 2, frustumSize / 2, frustumSize / - 2, 1, 2000 );

  renderer = new THREE.WebGLRenderer();
  renderer.phisiclyCorrectLights = true;
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  scene.background = new THREE.Color(0x08050c);
  document.body.appendChild(renderer.domElement);

  var pointLight = new THREE.PointLight(0xf7eabe);
  pointLight.intensity = 0.8;
  pointLight.decay = 2;

  var hemiLight = new THREE.HemisphereLight( 0xffffbb, 0x080820, 1 );
  scene.add(hemiLight);

  // Load all textures
  Textures.loadAll();

  // Generate terrain map
  Terrain.generateMap({
    width: 20,
    height: 20,
    generations: 4,
    randomize: .5
  });

  raycaster = new THREE.Raycaster();
	mouse = new THREE.Vector2();

  Terrain.group = new THREE.Group();

  pointLight.castShadow = true;
  pointLight.shadow.mapSize.width = 512;
  pointLight.shadow.mapSize.height = 512;

  camera.position.set(0, 0, 40);
  pointLight.position.x = Terrain.tileSize*Terrain.width/2;
  pointLight.position.y = Terrain.tileSize*Terrain.height/2;
  scene.add(pointLight);

  var orbit = new THREE.OrbitControls(camera, renderer.domElement);
  orbit.enableZoom = true;

  // Output generated map to canvas
  for (var i = 0; i < Terrain.height; i++) {
    for (var j = 0; j < Terrain.width; j++) {
      var geometry = new THREE.BoxBufferGeometry(
        Terrain.tileSize,
        Terrain.tileSize,
        1.3
      );
      var material;
      if (Terrain.map[i][j] == '0') {
        var planeG = new THREE.PlaneGeometry(
          Terrain.tileSize,
          Terrain.tileSize);
			  material = new THREE.MeshPhongMaterial(
          {map: Textures.list.water_01.texture});
          material.shininess = 100;
          tile = new THREE.Mesh(planeG, material);
          tile.userData['isFlat'] = false;
      } else if (Terrain.map[i][j] == '1') {

        material = new THREE.MeshLambertMaterial(
          {map: Textures.list.grass_01.texture});
          tile = new THREE.Mesh(geometry, material);
          tile.userData['isFlat'] = true;
      }
      tile.position.x = j * Terrain.tileSize;
      tile.position.y = i * Terrain.tileSize;
      tile.position.z = geometry.parameters.depth;
      Terrain.group.add(tile);
    }
  }

  Terrain.group.add(pointLight);

  var box = new THREE.Box3().setFromObject(Terrain.group);
  box.getCenter(Terrain.group.position); // this re-sets the mesh position
  Terrain.group.position.multiplyScalar(-1);

  Terrain.pivot = new THREE.Object3D();
  Terrain.pivot.add(Terrain.group);
  Terrain.pivot.rotation.z = toRad(45);
  camera.position.set(0, -30, 30);
  camera.lookAt(scene.position);
  pointLight.position.set(Terrain.width*Terrain.tileSize/2, Terrain.height*Terrain.tileSize/2, 25);
  scene.add(Terrain.pivot);
}

function updateLabelsPosition() {
  for (var l = 0; l < labels.length; l++) {
    var labelPos = calc2Dpoint(labels[l].parent3D, camera);
    labels[l].style.top = labelPos.y + 'px';
    labels[l].style.left = labelPos.x + 'px';
  }
}

function onWindowResize() {

  updateLabelsPosition();

  var aspect = window.innerWidth / window.innerHeight;
	camera.left   = - frustumSize * aspect / 2;
	camera.right  =   frustumSize * aspect / 2;
	camera.top    =   frustumSize / 2;
	camera.bottom = - frustumSize / 2;
	camera.updateProjectionMatrix();
	renderer.setSize( window.innerWidth, window.innerHeight );
}

function render() {
	requestAnimationFrame(render);
  loop();
	renderer.render(scene, camera);
}

function loop() {
  scrollMap();
  if (Terrain.rotation.cw)
    rotateMap('cw');
  if (Terrain.rotation.ccw)
    rotateMap('ccw');
  updateLabelsPosition();
}

function scrollMap() {
  if (cameraScrollDirection.right) {
    Terrain.pivot.position.x -= scrollSpeed;
  }
  if (cameraScrollDirection.left) {
    Terrain.pivot.position.x += scrollSpeed;
  }
  if (cameraScrollDirection.top) {
    Terrain.pivot.position.y -= scrollSpeed;
  }
  if (cameraScrollDirection.bottom) {
    Terrain.pivot.position.y += scrollSpeed;
  }
}

function rotateMap(direction) {
  if (Terrain.rotation[direction]) {
    var sign = direction == 'ccw' ? 1 : -1;
    disableElement(sign == -1 ? rBtnCcw : rBtnCw);
    if (!Terrain.rotation.targetAngle) {
      Terrain.rotation.targetAngle =
      Math.ceil(toDeg(Terrain.pivot.rotation.z)) + sign*90;
      console.log('current:', toDeg(Terrain.pivot.rotation.z));
      console.log('target:', Terrain.rotation.targetAngle);
    }
    Terrain.pivot.rotation.z += sign*0.05;

    var updatePos = function() {
      if (Math.abs(Terrain.rotation.targetAngle) >= 360)
        Terrain.rotation.targetAngle -= sign*360;
      Terrain.pivot.rotation.z = toRad(Terrain.rotation.targetAngle);
      console.log(direction, '| update (deg):', Math.ceil(toDeg(Terrain.pivot.rotation.z)));
      Terrain.rotation[direction] = false;
      Terrain.rotation.targetAngle = null;
      enableElement(sign == -1 ? rBtnCcw : rBtnCw);
    }

    if (direction == 'ccw' && Math.ceil(toDeg(Terrain.pivot.rotation.z)) -
        Math.ceil(Terrain.rotation.targetAngle) >= 0) updatePos();
    if (direction == 'cw' && Math.ceil(toDeg(Terrain.pivot.rotation.z)) -
        Math.ceil(Terrain.rotation.targetAngle) <= 0) updatePos();
  }
}

function onDocumentMouseMove(event) {
  var range = 5              // sensitivity zone range (px)
  var x = event.clientX;     // Get the horizontal coordinate
  var y = event.clientY;     // Get the vertical coordinate

  var rw = renderer.getSize().width;
  var rh = renderer.getSize().height;
  cameraScrollDirection.left = x <= range;
  cameraScrollDirection.right = rw - x <= range;
  cameraScrollDirection.top = y <= range;
  cameraScrollDirection.bottom = rh - y <= range;
}

function onDocumentMouseDown() {
  event.preventDefault();

	mouse.x = (event.clientX/renderer.domElement.clientWidth)*2-1;
	mouse.y = -(event.clientY/renderer.domElement.clientHeight)*2+1;

	raycaster.setFromCamera(mouse, camera);

	var intersects = raycaster.intersectObjects(Terrain.group.children);

	if (intersects.length > 0 && intersects[0].object.userData.isFlat) {
		// intersects[0].object.material.color.setHex(Math.random() * 0xffffff);
    //color: 0xbfb49f
    var bMaterials = [
      new THREE.MeshLambertMaterial({map: Textures.list.fort_01_f.texture}),
      new THREE.MeshLambertMaterial({map: Textures.list.fort_01_s.texture}),
      new THREE.MeshLambertMaterial({map: Textures.list.fort_01_s.texture}),
      new THREE.MeshLambertMaterial({map: Textures.list.fort_01_s.texture}),
      new THREE.MeshLambertMaterial({map: Textures.list.fort_01_t.texture}),
      new THREE.MeshLambertMaterial({map: Textures.list.fort_01_s.texture})
    ];

    var building = new THREE.Mesh(
      new THREE.BoxBufferGeometry((Terrain.tileSize-1), (Terrain.tileSize-1), 1),
      bMaterials);
    if (!intersects[0].object.userData.children) {
      building.receiveShadow = false;
      building.castShadow = true;
      building.rotation.copy(intersects[0].object);
      intersects[0].object.userData['children'] = building;
      building.position.x = intersects[0].object.position.x;
      building.position.y = intersects[0].object.position.y;
      building.position.z = intersects[0].object.position.z + 1.15;
      Terrain.group.add(building);

      // add label to a building
      var label = document.createElement('div');
      label.style.padding = '4px';
      label.style.background = 'rgba(255,255,255,.6)';
      label.style.position = 'absolute';
      label.classList.add('label');
      label.innerHTML = "FORT #" + building.id;
      var labelPos = calc2Dpoint(building, camera);
      label.style.top = labelPos.y + 'px';
      label.style.left = labelPos.x + 'px';
      label['parent3D'] = building;
      labels.push(label);
      document.body.appendChild(label);
    }
	}
}

function calc2Dpoint(obj, camera) {
  var vector = new THREE.Vector3();

    // TODO: need to update this when resize window
    var widthHalf = 0.5*renderer.context.canvas.width;
    var heightHalf = 0.5*renderer.context.canvas.height;

    obj.updateMatrixWorld();
    vector.setFromMatrixPosition(obj.matrixWorld);
    vector.project(camera);

    vector.x = ( vector.x * widthHalf ) + widthHalf;
    vector.y = - ( vector.y * heightHalf ) + heightHalf;

    return {
        x: vector.x,
        y: vector.y
    };
}

function disableElement(element) {
  element.classList.add('no-events');
}

function enableElement(element) {
  element.classList.remove('no-events');
}

function listenForRotation() {
  var rCwInt, rCcwInt;

  // rotate clockwise
  rBtnCw.addEventListener('mouseup', function() {
    Terrain.rotation.ccw = false;
    Terrain.rotation.cw = true;
  }, false);

  // rotate couterclockwise
  rBtnCcw.addEventListener('mouseup', function() {
    Terrain.rotation.cw = false;
    Terrain.rotation.ccw = true;
  }, false);
}

function listenForDom() {
  rBtnCw = document.querySelector('#map-rotate-cw');
  rBtnCcw = document.querySelector('#map-rotate-ccw');
  listenForRotation();
  window.addEventListener('resize', onWindowResize, false);
}

function init() {
  createScene();
  render();
  listenForDom();
  renderer.domElement.addEventListener('mousedown', onDocumentMouseDown, false);
  renderer.domElement.addEventListener('mousemove', onDocumentMouseMove, false);
}

function requestFullScreen(element) {
	if(element.requestFullscreen)
		element.requestFullscreen();
	else if(element.mozRequestFullScreen)
		element.mozRequestFullScreen();
	else if(element.webkitRequestFullscreen)
		element.webkitRequestFullscreen();
	else if(element.msRequestFullscreen)
		element.msRequestFullscreen();
}

window.onload = function() {
  // full-screen available?
  if (
  	document.fullscreenEnabled ||
  	document.webkitFullscreenEnabled ||
  	document.mozFullScreenEnabled ||
  	document.msFullscreenEnabled
  ) {
    requestFullScreen(document);
  }

  init();
}
