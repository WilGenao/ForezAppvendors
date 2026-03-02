import logging, sys, json
from datetime import datetime

class JSONFormatter(logging.Formatter):
    def format(self, record):
        entry = {"timestamp": datetime.utcnow().isoformat(), "level": record.levelname, "logger": record.name, "message": record.getMessage()}
        if record.exc_info:
            entry["exception"] = self.formatException(record.exc_info)
        return json.dumps(entry)

def setup_logging():
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JSONFormatter())
    logging.basicConfig(level=logging.INFO, handlers=[handler])
