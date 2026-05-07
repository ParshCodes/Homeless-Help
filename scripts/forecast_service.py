from datetime import datetime, timedelta
from flask import Flask, jsonify
import random

app = Flask(__name__)

@app.get('/forecast')
def forecast():
  today = datetime.utcnow().date()
  data = [
    {
      "date": (today + timedelta(days=i)).isoformat(),
      "value": random.randint(15, 40)
    }
    for i in range(7)
  ]
  return jsonify({"forecast": data})

if __name__ == '__main__':
  app.run(host='0.0.0.0', port=5001)
