// main.js - VERSIÓN OPTIMIZADA PARA MÓVIL

console.log('Iniciando Cube Hunt...');

const scene = new THREE.Scene();

// Configuración de cámara para móvil
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 1.6, 3);

const renderer = new THREE.WebGLRenderer({ 
    antialias: true,
    alpha: false
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Optimizar para móvil
renderer.xr.enabled = true;
document.body.appendChild(renderer.domElement);

// Variables globales
let greenCubes = [];
let currentRound = 1;
let cubesPerRound = 3; // Menos cubos para móvil
let cubesShot = 0;
let score = 0;
let lives = 3;
let highScore = localStorage.getItem('highScore') || 0;
let gameStarted = false;
let inVRMode = false;

// Mostrar información del dispositivo
showDeviceInfo();

function showDeviceInfo() {
    const infoDiv = document.getElementById('vr-info');
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    let infoText = `Móvil: ${isMobile ? 'Sí' : 'No'}`;
    infoText += ` | WebXR: ${'xr' in navigator ? 'Sí' : 'No'}`;
    
    infoDiv.textContent = infoText;
}

// Inicialización simplificada de VR
function initVR() {
    console.log('Inicializando VR...');
    
    if ('xr' in navigator) {
        // Para móviles, probar primero con 'immersive-ar' que es más compatible
        const sessionTypes = ['immersive-vr', 'immersive-ar', 'inline'];
        
        navigator.xr.isSessionSupported('immersive-vr')
            .then((vrSupported) => {
                if (vrSupported) {
                    console.log('VR inmersivo soportado');
                    createVRButton('immersive-vr');
                } else {
                    return navigator.xr.isSessionSupported('immersive-ar');
                }
            })
            .then((arSupported) => {
                if (arSupported) {
                    console.log('AR inmersivo soportado');
                    createVRButton('immersive-ar');
                } else {
                    console.log('Solo modo inline soportado');
                    createInlineXRButton();
                }
            })
            .catch((error) => {
                console.error('Error verificando soporte XR:', error);
                createVRWarning('Error verificando VR');
            });
    } else {
        console.log('WebXR no soportado');
        createVRWarning('WebXR no disponible');
    }
}

function createVRButton(sessionType) {
    const button = VRButton.createButton(renderer, { 
        sessionInit: { 
            optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking'] 
        } 
    });
    
    button.style.position = 'absolute';
    button.style.bottom = '20px';
    button.style.right = '20px';
    button.style.zIndex = '1000';
    document.body.appendChild(button);
    
    // Configurar eventos de sesión
    renderer.xr.addEventListener('sessionstart', () => {
        console.log('Sesión XR iniciada:', sessionType);
        inVRMode = true;
        onXRStart();
    });
    
    renderer.xr.addEventListener('sessionend', () => {
        console.log('Sesión XR terminada');
        inVRMode = false;
        onXREnd();
    });
}

function createInlineXRButton() {
    const button = document.createElement('button');
    button.textContent = '🎮 Vista 360°';
    button.style.position = 'absolute';
    button.style.bottom = '20px';
    button.style.right = '20px';
    button.style.zIndex = '1000';
    button.style.padding = '10px';
    button.style.background = '#2196F3';
    button.style.color = 'white';
    button.style.border = 'none';
    button.style.borderRadius = '5px';
    
    button.addEventListener('click', () => {
        // Modo 360° básico para móviles sin VR
        alert('Modo 360° activado. Usa el movimiento del dispositivo.');
    });
    
    document.body.appendChild(button);
}

function createVRWarning(message) {
    const warning = document.createElement('div');
    warning.textContent = message;
    warning.style.position = 'absolute';
    warning.style.bottom = '60px';
    warning.style.left = '10px';
    warning.style.color = 'orange';
    warning.style.fontFamily = 'Arial, sans-serif';
    warning.style.fontSize = '12px';
    warning.style.background = 'rgba(0,0,0,0.7)';
    warning.style.padding = '5px';
    warning.style.borderRadius = '5px';
    warning.style.zIndex = '1000';
    document.body.appendChild(warning);
}

function onXRStart() {
    console.log('Preparando experiencia VR...');
    // Los cubos se reposicionan automáticamente en startRound
}

function onXREnd() {
    console.log('Volviendo a modo normal...');
}

// Botón VR para móvil en el menú
document.getElementById('vrButtonMobile').addEventListener('click', () => {
    if ('xr' in navigator) {
        // Intentar iniciar sesión VR directamente
        navigator.xr.requestSession('immersive-vr')
            .then((session) => {
                renderer.xr.setSession(session);
            })
            .catch((error) => {
                console.error('Error iniciando VR:', error);
                alert('No se pudo iniciar VR. Error: ' + error.message);
            });
    } else {
        alert('Tu navegador no soporta WebXR. Prueba con Chrome o Firefox Reality.');
    }
});

// Control por toque para móvil
window.addEventListener('touchstart', (event) => {
    if (!gameStarted || lives <= 0 || inVRMode) return;
    
    event.preventDefault();
    
    const touch = event.touches[0];
    const mouse = new THREE.Vector2(
        (touch.clientX / window.innerWidth) * 2 - 1,
        -(touch.clientY / window.innerHeight) * 2 + 1
    );
    
    const raycaster = new THREE.Raycaster();
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
        handleMiss();
    }
});

// Iluminación básica
const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
scene.add(ambientLight);

// Fondo simple si no hay skybox
const backgroundLoader = new THREE.CubeTextureLoader();
backgroundLoader.setPath('uv/');
backgroundLoader.load([
    'px.png', 'nx.png', 'py.png', 'ny.png', 'pz.png', 'nz.png'
], (texture) => {
    scene.background = texture;
}, undefined, (error) => {
    console.log('Usando fondo color sólido');
    scene.background = new THREE.Color(0x87CEEB); // Azul cielo como fallback
});

// Cargar modelo (opcional)
try {
    const objLoader = new THREE.OBJLoader();
    objLoader.load('modelos/bosque.obj', 
        (object) => {
            object.position.set(0, -2, 0);
            object.scale.set(0.8, 0.8, 0.8);
            scene.add(object);
            console.log('Modelo cargado');
        },
        undefined,
        (error) => {
            console.log('Modelo no cargado, continuando sin él');
        }
    );
} catch (error) {
    console.log('Error cargando modelo:', error);
}

// Iniciar juego
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
    updateUI();
}

function startRound() {
    console.log(`Ronda ${currentRound}`);
    greenCubes = [];
    
    for (let i = 0; i < cubesPerRound; i++) {
        createGreenCube(i);
    }
    cubesShot = 0;
    updateUI();
}

function createGreenCube(index) {
    const geometry = new THREE.BoxGeometry(0.3, 0.3, 0.3); // Más pequeño para móvil
    const material = new THREE.MeshLambertMaterial({ color: 0x00ff00 });
    const cube = new THREE.Mesh(geometry, material);
    
    if (inVRMode) {
        // Distribuir alrededor en VR
        const angle = (index / cubesPerRound) * Math.PI * 2;
        const radius = 2;
        cube.position.set(
            Math.cos(angle) * radius,
            1.5 + Math.random(),
            Math.sin(angle) * radius
        );
    } else {
        // Distribución normal
        cube.position.set(
            (Math.random() - 0.5) * 8,
            Math.random() * 4 + 1,
            0
        );
    }
    
    cube.spawnTime = Date.now();
    scene.add(cube);
    greenCubes.push(cube);
}

function animateCubes() {
    const speed = 1 + (currentRound - 1) * 0.1; // Más lento para móvil
    
    greenCubes.forEach(cube => {
        if (cube && !cube.isShot) {
            const time = Date.now() * 0.001;
            cube.position.x += Math.sin(time + cube.position.x) * 0.005 * speed;
            cube.position.y += Math.cos(time * 1.3 + cube.position.y) * 0.005 * speed;
            
            if (inVRMode) {
                cube.position.z += Math.sin(time * 0.7) * 0.003 * speed;
            }
        }
    });
}

function disparo(cube) {
    if (cube && !cube.isShot) {
        cube.isShot = true;
        cube.material.color.setHex(0xff0000);
        
        const reactionTime = (Date.now() - cube.spawnTime) / 1000;
        let points = Math.max(50, 100 - Math.floor(reactionTime * 20));
        score += points;
        lives = Math.min(3, lives + 1);
        
        cubesShot++;
        
        console.log(`¡Golpe! +${points} puntos`);
        updateUI();
        
        if (cubesShot >= cubesPerRound) {
            setTimeout(() => {
                currentRound++;
                startRound();
            }, 1500);
        }
    }
}

function handleMiss() {
    lives--;
    score = Math.max(0, score - 10);
    
    console.log(`Fallo! Vidas: ${lives}`);
    updateUI();
    
    if (lives <= 0) {
        gameOver();
    }
}

function updateUI() {
    document.getElementById('round').textContent = currentRound;
    document.getElementById('score').textContent = score;
    document.getElementById('lives').textContent = lives;
    document.getElementById('highScore').textContent = highScore;
}

function gameOver() {
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('highScore', highScore);
    }
    
    gameStarted = false;
    setTimeout(() => {
        document.getElementById('menu').style.display = 'block';
        document.getElementById('ui').style.display = 'none';
    }, 2000);
}

// Bucle de animación
function animate() {
    if (gameStarted) {
        animateCubes();
        
        // Limpiar cubos disparados
        greenCubes = greenCubes.filter(cube => {
            if (cube.isShot) {
                const elapsed = (Date.now() - cube.spawnTime) / 1000;
                if (elapsed > 1.5) {
                    scene.remove(cube);
                    return false;
                }
            }
            return true;
        });
    }
    
    renderer.render(scene, camera);
}

renderer.setAnimationLoop(animate);

// Manejo de resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Inicializar VR después de cargar
setTimeout(() => {
    initVR();
}, 1000);

console.log('Juego cargado. Esperando interacción...');
