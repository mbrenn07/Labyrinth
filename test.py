import requests
response = requests.post("http://localhost:5000/player", json={
    "picture": "iVBORw0...",
    "path": [{"x": 1, "y": 2}],
    "sound": "UklGRlw..."
})
print(response.json())
