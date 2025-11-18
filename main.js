const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(-0.030334074747951856, 2, 5);
camera.rotation.set(-0.1407195740688759, 0.06389826150723957, 0.0090451565050258);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Habilitar WebXR para soporte VR
renderer.xr.enabled = true;

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// Controladores VR
let controller1, controller2;
let controllerGrip1, controllerGrip2;

// Función para inicializar controladores VR
function initVRControllers() {
    controller1 = renderer.xr.getController(0);
    controller1.addEventListener('selectstart', onSelectStart);
    controller1.addEventListener('selectend', onSelectEnd);
    scene.add(controller1);

    controller2 = renderer.xr.getController(1);
    controller2.addEventListener('selectstart', onSelectStart);
    controller2.addEventListener('selectend', onSelectEnd);
    scene.add(controller2);

    controllerGrip1 = renderer.xr.getControllerGrip(0);
    controllerGrip1.add(new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.1), new THREE.MeshBasicMaterial({ color: 0x000000 })));
    scene.add(controllerGrip1);

    controllerGrip2 = renderer.xr.getControllerGrip(1);
    controllerGrip2.add(new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.1), new THREE.MeshBasicMaterial({ color: 0x000000 })));
    scene.add(controllerGrip2);

    // Líneas de rayo para feedback visual
    const geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1)]);
    const material = new THREE.LineBasicMaterial({ color: 0xffffff });
    const line1 = new THREE.Line(geometry, material);
    line1.scale.z = 5;
    controller1.add(line1.clone());

    const line2 = new THREE.Line(geometry, material);
    line2.scale.z = 5;
    controller2.add(line2.clone());
}

// Eventos para controladores VR
function onSelectStart(event) {
    if (!gameStarted || lives <= 0) return;
    const controller = event.target;
    const intersections = getIntersections(controller);
    if (intersections.length > 0) {
        const intersectedObject = intersections[0].object;
        if (greenCubes.includes(intersectedObject)) {
            disparo(intersectedObject);
        }
    }
}

function onSelectEnd(event) {
    // Opcional: lógica adicional al soltar el gatillo
}

function getIntersections(controller) {
    const tempMatrix = new THREE.Matrix4();
    tempMatrix.identity().extractRotation(controller.matrixWorld);
    raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
    raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);
    return raycaster.intersectObjects(greenCubes, false);
}

// Mantener el evento de mouse para modo no-VR
window.addEventListener('click', (event) => {
    if (!gameStarted || lives <= 0 || renderer.xr.isPresenting) return; // No usar mouse si está en VR

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    let hit = false;
    for (let cube of greenCubes) {
        const intersects = raycaster.intersectObject(cube);
        if (intersects.length > 0) {
            disparo(cube);
            hit = true;
            break;
        }
    }
    if (!hit) {
        lives--;
        score -= 20;
        document.getElementById('score').textContent = score;
        document.getElementById('lives').textContent = lives;
        console.log(`Fallo! Puntuación: ${score}, Vidas restantes: ${lives}`);
        if (lives <= 0) {
            if (score > highScore) {
                highScore = score;
                localStorage.setItem('highScore', highScore);
                document.getElementById('highScore').textContent = highScore;
            }
            console.log(`Juego terminado! Puntuación final: ${score}, Mejor puntuación: ${highScore}`);
            gameStarted = false;
            setTimeout(() => {
                document.getElementById('menu').style.display = 'block';
                document.getElementById('ui').style.display = 'none';
            }, 2000);
        }
    }
});

const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const cubeTextureLoader = new THREE.CubeTextureLoader();
cubeTextureLoader.setPath('uv/');
const cubeTexture = cubeTextureLoader.load([
    'px.png',
    'nx.png',
    'py.png',
    'ny.png',
    'pz.png',
    'nz.png'
]);
scene.background = cubeTexture;

let greenCubes = [];
let currentRound = 1;
let cubesPerRound = 5;
let cubesShot = 0;
let score = 0;
let roundStartTime = 0;
let lives = 3;
let highScore = localStorage.getItem('highScore') || 0;
let gameStarted = false;

const objLoader = new THREE.OBJLoader();
objLoader.load('modelos/bosque.obj', (object) => {
    object.position.set(-1, -2, 0);
    object.rotation.y = Math.PI / 2;
    object.scale.set(1, 1, 1);
    scene.add(object);

    const redCubeGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const redCubeMaterial = new THREE.MeshLambertMaterial({ color: 0xff0000 });
    const redCube = new THREE.Mesh(redCubeGeometry, redCubeMaterial);
    redCube.position.set(-6, -2, 0);
    scene.add(redCube);

    document.getElementById('highScore').textContent = highScore;

    // Inicializar controladores VR después de cargar el modelo
    initVRControllers();
});

// Agregar botón VR al menú
const vrButton = document.createElement('button');
vrButton.textContent = 'Entrar en VR';
vrButton.style.fontSize = '24px';
vrButton.style.padding = '10px 20px';
vrButton.style.background = '#2196F3';
vrButton.style.color = 'white';
vrButton.style.border = 'none';
vrButton.style.borderRadius = '5px';
vrButton.style.cursor = 'pointer';
vrButton.style.marginTop = '20px';
vrButton.addEventListener('click', () => {
    if (navigator.xr) {
        navigator.xr.requestSession('immersive-vr').then((session) => {
            renderer.xr.setSession(session);
        }).catch((error) => {
            console.error('Error al iniciar sesión VR:', error);
            alert('VR no está disponible. Asegúrate de tener un headset VR conectado y un navegador compatible.');
        });
    } else {
        alert('WebXR no está soportado en este navegador.');
    }
});
document.getElementById('menu').appendChild(vrButton);

document.getElementById('startButton').addEventListener('click', () => {
    document.getElementById('menu').style.display = 'none';
    document.getElementById('ui').style.display = 'block';
    gameStarted = true;
    resetGame();
    startRound();
});

function resetGame() {
    currentRound = 1;
    score = 0;
    lives = 3;
    cubesShot = 0;
    greenCubes.forEach(cube => scene.remove(cube));
    greenCubes = [];
    document.getElementById('round').textContent = currentRound;
    document.getElementById('score').textContent = score;
    document.getElementById('lives').textContent = lives;
}

function startRound() {
    console.log(`Ronda ${currentRound}`);
    document.getElementById('round').textContent = currentRound;
    roundStartTime = Date.now();
    greenCubes = [];
    for (let i = 0; i < cubesPerRound; i++) {
        const greenCubeGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
        const greenCubeMaterial = new THREE.MeshLambertMaterial({ color: 0x00ff00 });
        const greenCube = new THREE.Mesh(greenCubeGeometry, greenCubeMaterial);
        greenCube.position.set(Math.random() * 12 - 6, Math.random() * 6 + 1, 0);
        greenCube.spawnTime = Date.now();
        scene.add(greenCube);
        greenCubes.push(greenCube);
    }
    cubesShot = 0;
}

function volar() {
    const speedMultiplier = 1 + (currentRound - 1) * 0.2;
    greenCubes.forEach(cube => {
        if (cube && !cube.isShot) {
            const time = Date.now() * 0.001 + cube.position.x * 0.1;
            cube.position.x += Math.sin(time) * 0.01 * speedMultiplier;
            cube.position.y += Math.sin(time * 1.1) * 0.01 * speedMultiplier;
        }
    });
}

function disparo(cube) {
    if (cube && !cube.isShot) {
        cube.isShot = true;
        cube.material.color.setHex(0xff0000);
        cube.fadeStartTime = Date.now();
        const reactionTime = (Date.now() - cube.spawnTime) / 1000;
        let points = 100;
        if (reactionTime < 1) {
            points += 50;
        } else if (reactionTime > 3) {
            points -= 50;
        }
        score += points;
        lives++;
        if (lives > 3) lives = 3;
        document.getElementById('score').textContent = score;
        document.getElementById('lives').textContent = lives;
        console.log(`Puntuación: ${score}, Tiempo de reacción: ${reactionTime.toFixed(2)}s, Vidas: ${lives}`);
        cubesShot++;
        if (cubesShot >= cubesPerRound) {
            setTimeout(() => {
                currentRound++;
                showRoundMessage();
                startRound();
            }, 2000);
        }
    }
}

// Función de animación unificada para VR y no-VR
function animate() {
    if (gameStarted) {
        volar();

        greenCubes.forEach(cube => {
            if (cube && cube.isShot) {
                const elapsed = (Date.now() - cube.fadeStartTime) / 1000;
                const fadeDuration = 2;
                if (elapsed < fadeDuration) {
                    const opacity = 1 - (elapsed / fadeDuration);
                    cube.material.transparent = true;
                    cube.material.opacity = opacity;
                } else {
                    scene.remove(cube);
                    greenCubes.splice(greenCubes.indexOf(cube), 1);
                }
            }
        });
    }

    renderer.render(scene, camera);
}

renderer.setAnimationLoop(animate);

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

function showRoundMessage() {
    const message = document.createElement('div');
    message.textContent = `¡Ronda ${currentRound}!`;
    message.style.position = 'absolute';
    message.style.top = '50%';
    message.style.left = '50%';
    message.style.transform = 'translate(-50%, -50%)';
    message.style.color = 'white';
    message.style.fontSize = '48px';
    message.style.fontFamily = 'Arial, sans-serif';
    message.style.background = 'rgba(0, 0, 0, 0.7)';
    message.style.padding = '20px';
    message.style.borderRadius = '10px';
    message.style.zIndex = '1000';
    document.body.appendChild(message);
    setTimeout(() => {
        document.body.removeChild(message);
    }, 2000);
}
