import sys
from pathlib import Path

import pytest

# Add the project root (api directory) to pythonpath so imports like `from core...` resolve correctly
sys.path.insert(0, str(Path(__file__).parent.parent))


@pytest.fixture(scope="session")
def test_target_url() -> str:
    """
    Global fixture providing a standard test URL for core and functions tests.
    """
    return "https://www.youtube.com"
