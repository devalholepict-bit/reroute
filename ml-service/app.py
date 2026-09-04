from flask import Flask
from flask_cors import CORS
from config import PORT, DEBUG
from routes.health import health_bp
from routes.diagnose import diagnose_bp

app = Flask(__name__)
CORS(app)

app.register_blueprint(health_bp)
app.register_blueprint(diagnose_bp)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=PORT, debug=DEBUG)

