import os
import sys

# Ensure 'app' package is discoverable on python path
app_dir = os.path.abspath(os.path.dirname(__file__))
if app_dir not in sys.path:
    sys.path.insert(0, app_dir)

parent_dir = os.path.abspath(os.path.join(app_dir, ".."))
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

__version__ = "1.0.0"
