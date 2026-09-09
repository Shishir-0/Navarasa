"""
Integration tests for FastAPI REST API routes.
"""

import pytest
from fastapi.testclient import TestClient
from api.server import app
from backend.engine import NavrasaAutonomyEngine


def test_api_endpoints():
    # Prime the pipeline with 1 step so latest_frame is populated
    engine = NavrasaAutonomyEngine()
    engine.load_scenario("autorickshaw_cutin_blindspot")
    engine.step(dt=0.05)

    client = TestClient(app)

    # 1. Health check
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "HEALTHY"

    # 2. Actors
    res = client.get("/actors")
    assert res.status_code == 200
    assert len(res.json()) >= 1

    # 3. Tracks
    res = client.get("/tracks")
    assert res.status_code == 200

    # 4. Graph
    res = client.get("/graph")
    assert res.status_code == 200
    assert "nodes" in res.json()

    # 5. Prediction
    res = client.get("/prediction")
    assert res.status_code == 200

    # 6. Risk
    res = client.get("/risk")
    assert res.status_code == 200

    # 7. Planner
    res = client.get("/planner")
    assert res.status_code == 200

    # 8. Control
    res = client.get("/control")
    assert res.status_code == 200

    # 9. Metrics
    res = client.get("/metrics")
    assert res.status_code == 200
    assert "fps" in res.json()
