from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi
from dotenv import load_dotenv
import os
from flask import Flask, request, jsonify
from datetime import datetime, timedelta


load_dotenv()
app = Flask(__name__)

uri = os.getenv("MONGO_URI")
# Create a new client and connect to the server
client = MongoClient(uri, server_api=ServerApi('1'))
db = client['user-paths']
players_collection = db['players']


def check_rate_limit():
    # Use client IP as identifier (or user ID if authenticated)
    client_id = request.remote_addr

    # Rate limit config
    max_requests = 2
    period_hours = 24

    # Check existing records
    rate_record = db.rate_limits.find_one({'_id': client_id})

    if rate_record:
        # Check if period has expired
        if datetime.now() - rate_record['last_request'] < timedelta(hours=period_hours):
            if rate_record['count'] >= max_requests:
                return jsonify({"error": "Rate limit exceeded - 2 submissions per day"}), 429
            # Increment count
            db.rate_limits.update_one(
                {'_id': client_id},
                {'$inc': {'count': 1}}
            )
        else:
            # Reset counter
            db.rate_limits.update_one(
                {'_id': client_id},
                {'$set': {'count': 1, 'last_request': datetime.now()}}
            )
    else:
        # First request
        db.rate_limits.insert_one({
            '_id': client_id,
            'count': 1,
            'last_request': datetime.now()
        })

    return None


@app.route('/player', methods=['POST'])
def create_player():
    rate_limit_response = check_rate_limit()
    if rate_limit_response:
        return rate_limit_response

    # Get JSON data from request
    data = request.get_json()

    # Validate required fields
    if not data or 'picture' not in data or 'path' not in data or 'sound' not in data:
        return jsonify({"error": "Missing required fields"}), 400

    # Validate path structure
    if not isinstance(data['path'], list):
        return jsonify({"error": "Path must be a list"}), 400

    for point in data['path']:
        if not isinstance(point, dict) or 'x' not in point or 'y' not in point:
            return jsonify({"error": "Invalid path point structure"}), 400
        if not isinstance(point['x'], (int, float)) or not isinstance(point['y'], (int, float)):
            return jsonify({"error": "Path coordinates must be numbers"}), 400

    try:
        # Insert the player document into MongoDB
        players_collection.insert_one({
            "picture": data['picture'],
            "path": data['path'],
            "sound": data['sound']
        })

        # Return the inserted document ID
        return jsonify({
            "message": "Player created successfully"
        }), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/players/random', methods=['GET'])
def get_random_players():
    try:
        # Get 10 random players and exclude the _id field
        random_players = list(players_collection.aggregate([
            {'$sample': {'size': 10}},
            {'$project': {'_id': 0}}  # Exclude the _id field
        ]))

        print()

        return jsonify(random_players), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
