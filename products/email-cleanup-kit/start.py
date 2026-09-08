#!/usr/bin/env python3
"""Open the guided menu. --demo uses only sample mail; --check checks Python only."""
import sys

sys.dont_write_bytecode = True
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(errors="backslashreplace")
if sys.version_info < (3, 9):
    sys.exit("Python 3.9 or newer is needed. Get a supported version at https://www.python.org/downloads/")

from payload.guided import main

if __name__ == "__main__":
    main()
