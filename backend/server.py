from flask import Flask, render_template, request, jsonify
import chess
import chess.engine
import random
import os
from flask_cors import CORS  # Add this import

app = Flask(__name__, template_folder='templates')
CORS(app, resources={r"/*": {"origins": "http://localhost:5173"}})

# Initialize the chess board
board = chess.Board()

# AI difficulty levels
difficulty_levels = {
    'easy': {'depth': 1, 'randomness': 0.3},
    'medium': {'depth': 3, 'randomness': 0.1},
    'hard': {'depth': 5, 'randomness': 0.05}
}

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/reset', methods=['POST', 'OPTIONS'])
def reset_game():
    global board
    board = chess.Board()  # Reset the board
    return jsonify({'status': 'success', 'fen': board.fen()})


@app.route('/make_move', methods=['POST'])
def make_move():
    data = request.json
    move = data['move']
    
    try:
        # Try to make the move on the board
        board.push_san(move)
        return jsonify({'status': 'success', 'fen': board.fen()})
    except Exception as e:
        print(f"[Server] Invalid move received: {move}. Error: {e}")
        return jsonify({'status': 'error', 'message': 'Invalid move'}), 400
    
@app.route('/ai_move', methods=['POST'])
def ai_move():
    data = request.json
    difficulty = data.get('difficulty', 'medium')
    
    # Get AI move based on difficulty
    ai_move = get_ai_move(difficulty)
    san = board.san(ai_move)  # Get SAN first
    board.push(ai_move)       # Then push the move
    
    return jsonify({
        'status': 'success',
        'move': san,
        'fen': board.fen()
    })


def get_ai_move(difficulty):
    """Generate AI move using Minimax with Alpha-Beta pruning"""
    level = difficulty_levels.get(difficulty, difficulty_levels['medium'])
    
    # Use Minimax with Alpha-Beta pruning
    best_move = None
    best_value = -float('inf')
    
    for move in board.legal_moves:
        board.push(move)
        move_value = minimax(board, level['depth'] - 1, -float('inf'), float('inf'), False)
        board.pop()
        
        # Add some randomness based on difficulty
        move_value += random.uniform(-level['randomness'], level['randomness'])
        
        if move_value > best_value:
            best_value = move_value
            best_move = move
    
    return best_move

def minimax(board, depth, alpha, beta, maximizing_player):
    """Minimax algorithm with Alpha-Beta pruning"""
    if depth == 0 or board.is_game_over():
        return evaluate_board(board)
    
    if maximizing_player:
        max_eval = -float('inf')
        for move in board.legal_moves:
            board.push(move)
            eval = minimax(board, depth - 1, alpha, beta, False)
            board.pop()
            max_eval = max(max_eval, eval)
            alpha = max(alpha, eval)
            if beta <= alpha:
                break
        return max_eval
    else:
        min_eval = float('inf')
        for move in board.legal_moves:
            board.push(move)
            eval = minimax(board, depth - 1, alpha, beta, True)
            board.pop()
            min_eval = min(min_eval, eval)
            beta = min(beta, eval)
            if beta <= alpha:
                break
        return min_eval

def evaluate_board(board):
    """Simple board evaluation function"""
    if board.is_checkmate():
        if board.turn:
            return -1000  # Black wins
        else:
            return 1000   # White wins
    elif board.is_stalemate() or board.is_insufficient_material() or board.is_seventyfive_moves():
        return 0
    
    # Piece values
    piece_values = {
        chess.PAWN: 1,
        chess.KNIGHT: 3,
        chess.BISHOP: 3,
        chess.ROOK: 5,
        chess.QUEEN: 9,
        chess.KING: 0
    }
    
    score = 0
    for square in chess.SQUARES:
        piece = board.piece_at(square)
        if piece:
            value = piece_values[piece.piece_type]
            if piece.color == chess.WHITE:
                score += value
            else:
                score -= value
    
    return score

if __name__ == '__main__':
    app.run(debug=True)