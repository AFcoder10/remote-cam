from flask import Flask, render_template, request
from flask_socketio import SocketIO, emit, join_room

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'
socketio = SocketIO(app, cors_allowed_origins="*")

@app.route('/')
def index():
    return render_template('index.html')

@socketio.on('join')
def on_join(room):
    join_room(room)
    emit('ready', room=room, broadcast=True, include_self=False)

@socketio.on('offer')
def on_offer(data):
    emit('offer', data, room=data['room'], include_self=False)

@socketio.on('answer')
def on_answer(data):
    emit('answer', data, room=data['room'], include_self=False)

@socketio.on('candidate')
def on_candidate(data):
    emit('candidate', data, room=data['room'], include_self=False)

if __name__ == '__main__':
    # host='0.0.0.0' allows access from local network
    # ssl_context='adhoc' creates a self-signed cert to allow camera access (requires HTTPS)
    try:
        socketio.run(app, debug=True, host='0.0.0.0', port=5000, ssl_context='adhoc')
    except Exception as e:
        print(f"Error starting with SSL: {e}")
        print("Falling back to HTTP (Camera might not work on remote devices)")
        socketio.run(app, debug=True, host='0.0.0.0', port=5000)
