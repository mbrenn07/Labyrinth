from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi
from dotenv import load_dotenv
import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime, timedelta


load_dotenv()
app = Flask(__name__)
cors = CORS(app)

uri = os.getenv("MONGO_URI")
# Create a new client and connect to the server
client = MongoClient(uri, server_api=ServerApi('1'))
db = client['user-paths']
players_collection = db['players']


@app.route('/player', methods=['POST'])
def create_player():
    # Get JSON data from request
    data = request.get_json()

    # Validate required fields
    if not data or 'picture' not in data or 'path' not in data or 'sound' not in data:
        return jsonify({"error": "Missing required fields"}), 400

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
