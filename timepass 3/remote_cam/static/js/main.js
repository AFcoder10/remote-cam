const socket = io();
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const selectionScreen = document.getElementById('selectionScreen');
const videoArea = document.getElementById('videoArea');
const statusText = document.getElementById('statusText');

const room = 'default_room';
let peerConnection;
const config = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
    ]
};

socket.on('connect', () => {
    console.log('Connected to signaling server');
    statusText.innerText = "Connected to server. Ready.";
});

function startStreamer() {
    selectionScreen.style.display = 'none';
    videoArea.style.display = 'block';
    localVideo.style.display = 'block'; // Show local preview
    remoteVideo.style.display = 'none'; // Hide remote
    statusText.innerText = "Waiting for receiver...";

    socket.emit('join', room);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert("Camera API not available! You must use HTTPS or localhost.");
        statusText.innerText = "Camera API not available (Use HTTPS)";
        return;
    }

    navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        .then(stream => {
            localVideo.srcObject = stream;

            socket.on('ready', () => {
                console.log('Receiver ready, making offer');
                statusText.innerText = "Connecting...";
                makeOffer();
            });

            socket.on('answer', handleAnswer);
            socket.on('candidate', handleCandidate);
        })
        .catch(err => {
            console.error('Error accessing camera:', err);
            alert("Error accessing camera: " + err.message + "\n\nMake sure you are on HTTPS and have granted permissions.");
            statusText.innerText = "Error accessing camera. " + err.message;
        });
}

function startViewer() {
    selectionScreen.style.display = 'none';
    videoArea.style.display = 'block';
    localVideo.style.display = 'none'; // Hide local
    remoteVideo.style.display = 'block'; // Show remote
    statusText.innerText = "Waiting for stream...";

    socket.emit('join', room);

    socket.on('offer', handleOffer);
    socket.on('candidate', handleCandidate);
    // Viewer doesn't stream effectively, so no getUserMedia needed immediately
}

async function makeOffer() {
    peerConnection = new RTCPeerConnection(config);

    // Add local stream tracks to peer connection
    const stream = localVideo.srcObject;
    stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));

    peerConnection.onicecandidate = event => {
        if (event.candidate) {
            socket.emit('candidate', { room: room, candidate: event.candidate });
        }
    };

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit('offer', { room: room, sdp: offer });
}

async function handleOffer(data) {
    if (!peerConnection) {
        peerConnection = new RTCPeerConnection(config);

        peerConnection.onicecandidate = event => {
            if (event.candidate) {
                socket.emit('candidate', { room: room, candidate: event.candidate });
            }
        };

        peerConnection.ontrack = event => {
            remoteVideo.srcObject = event.streams[0];
            statusText.innerText = "Connected";
        };
    }

    await peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socket.emit('answer', { room: room, sdp: answer });
}

async function handleAnswer(data) {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp));
    statusText.innerText = "Streaming active";
}

async function handleCandidate(data) {
    if (peerConnection) {
        await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
    }
}
