import os
from dotenv import load_dotenv

load_dotenv()

PORT = int(os.getenv("PORT", 5001))
DEBUG = os.getenv("FLASK_DEBUG", "true").lower() == "true"
