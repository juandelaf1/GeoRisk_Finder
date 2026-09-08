"""GeoRisk V3 — Backend API tests.

Run with:  pytest tests/test_api.py -v
"""

import pytest

from main import DEMO_USERS, _projects_db


# ---------------------------------------------------------------------------
# Health / startup
# ---------------------------------------------------------------------------

class TestHealth:
    def test_app_creates_successfully(self, client):
        assert client.app is not None


# ---------------------------------------------------------------------------
# Core data endpoints
# ---------------------------------------------------------------------------

class TestLayers:
    def test_get_layers_returns_dict_with_layers_key(self, client):
        resp = client.get("/api/layers")
        assert resp.status_code == 200
        body = resp.json()
        assert "layers" in body
        assert isinstance(body["layers"], list)
        assert len(body["layers"]) > 0


class TestRanking:
    def test_get_ranking_returns_list(self, client):
        resp = client.get("/api/ranking")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_get_ranking_with_limit(self, client):
        resp = client.get("/api/ranking?limit=3")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) <= 3


class TestSearch:
    def test_search_returns_results(self, client):
        resp = client.get("/api/search?q=Tokyo")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)

    def test_search_empty_query(self, client):
        resp = client.get("/api/search?q=x")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)


# ---------------------------------------------------------------------------
# Cell endpoints
# ---------------------------------------------------------------------------

class TestCellEndpoints:
    def test_get_cell_not_returns_404_for_invalid(self, client):
        resp = client.get("/api/cell/INVALID_CELL_999")
        assert resp.status_code == 404

    def test_get_economic_not_returns_404_for_invalid(self, client):
        resp = client.get("/api/economic/INVALID_CELL_999")
        assert resp.status_code == 404

    def test_get_events_returns_list_for_valid_cell(self, client):
        ranking = client.get("/api/ranking?limit=1").json()
        if not ranking:
            pytest.skip("No ranking data available")
        cell_id = ranking[0].get("cell_id")
        if not cell_id:
            pytest.skip("cell_id missing from ranking")
        resp = client.get(f"/api/events/{cell_id}")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_get_explain_returns_story_for_valid_cell(self, client):
        ranking = client.get("/api/ranking?limit=1").json()
        if not ranking:
            pytest.skip("No ranking data available")
        cell_id = ranking[0].get("cell_id")
        if not cell_id:
            pytest.skip("cell_id missing from ranking")
        resp = client.get(f"/api/explain/{cell_id}")
        assert resp.status_code == 200
        body = resp.json()
        assert "risk_story" in body
        assert "hazard_breakdown" in body
        assert "risk_score" in body


# ---------------------------------------------------------------------------
# Financial
# ---------------------------------------------------------------------------

class TestFinancial:
    def test_get_financial_returns_list(self, client):
        resp = client.get("/api/financial")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)

    def test_get_scenarios_returns_4_scenarios(self, client):
        resp = client.get("/api/scenarios")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) == 4


# ---------------------------------------------------------------------------
# Stats
# ---------------------------------------------------------------------------

class TestStats:
    def test_get_stats_returns_keys(self, client):
        resp = client.get("/api/stats")
        assert resp.status_code == 200
        body = resp.json()
        for key in ("total_cells", "mean_risk", "critical_cells"):
            assert key in body


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------

class TestAuth:
    def test_login_success(self, client):
        resp = client.post(
            "/api/auth/login",
            json={"email": "admin@georisk.com", "password": "admin123"},
        )
        assert resp.status_code == 200
        body = resp.json()
        assert "token" in body
        assert body["user"]["email"] == "admin@georisk.com"
        assert body["user"]["role"] == "admin"

    def test_login_invalid_credentials(self, client):
        resp = client.post(
            "/api/auth/login",
            json={"email": "admin@georisk.com", "password": "wrongpass"},
        )
        assert resp.status_code == 401

    def test_register_success(self, client):
        resp = client.post(
            "/api/auth/register",
            json={
                "email": "newuser@test.com",
                "password": "pass123",
                "name": "New User",
                "role": "government",
            },
        )
        assert resp.status_code == 200
        body = resp.json()
        assert "token" in body
        assert body["user"]["email"] == "newuser@test.com"
        DEMO_USERS.pop("newuser@test.com", None)

    def test_register_duplicate_returns_409(self, client):
        resp = client.post(
            "/api/auth/register",
            json={
                "email": "admin@georisk.com",
                "password": "pass123",
                "name": "Dup",
                "role": "admin",
            },
        )
        assert resp.status_code == 409

    def test_auth_me_valid_token(self, client, auth_token):
        resp = client.get(f"/api/auth/me?token={auth_token}")
        assert resp.status_code == 200
        body = resp.json()
        assert body["email"] == "admin@georisk.com"

    def test_auth_me_invalid_token(self, client):
        resp = client.get("/api/auth/me?token=garbage_token_12345")
        assert resp.status_code == 401


# ---------------------------------------------------------------------------
# Projects CRUD
# ---------------------------------------------------------------------------

class TestProjects:
    def test_create_project(self, client, auth_token):
        resp = client.post(
            f"/api/projects?token={auth_token}",
            json={"name": "Test Project", "description": "desc", "cell_ids": [], "tags": []},
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["name"] == "Test Project"
        assert "id" in body

    def test_list_projects(self, client, auth_token):
        client.post(
            f"/api/projects?token={auth_token}",
            json={"name": "P1", "description": "", "cell_ids": [], "tags": []},
        )
        resp = client.get(f"/api/projects?token={auth_token}")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)
        assert len(resp.json()) >= 1

    def test_get_project(self, client, auth_token):
        create = client.post(
            f"/api/projects?token={auth_token}",
            json={"name": "Get Me", "description": "", "cell_ids": [], "tags": []},
        )
        pid = create.json()["id"]
        resp = client.get(f"/api/projects/{pid}?token={auth_token}")
        assert resp.status_code == 200
        assert resp.json()["name"] == "Get Me"

    def test_update_project(self, client, auth_token):
        create = client.post(
            f"/api/projects?token={auth_token}",
            json={"name": "Old", "description": "", "cell_ids": [], "tags": []},
        )
        pid = create.json()["id"]
        resp = client.put(
            f"/api/projects/{pid}?token={auth_token}",
            json={"name": "New", "description": "updated", "cell_ids": [], "tags": []},
        )
        assert resp.status_code == 200
        assert resp.json()["name"] == "New"

    def test_delete_project(self, client, auth_token):
        create = client.post(
            f"/api/projects?token={auth_token}",
            json={"name": "Delete Me", "description": "", "cell_ids": [], "tags": []},
        )
        pid = create.json()["id"]
        resp = client.delete(f"/api/projects/{pid}?token={auth_token}")
        assert resp.status_code == 200
        assert resp.json()["deleted"] is True
        resp2 = client.get(f"/api/projects/{pid}?token={auth_token}")
        assert resp2.status_code == 404

    def test_project_not_found(self, client, auth_token):
        resp = client.get(f"/api/projects/proj-nonexistent?token={auth_token}")
        assert resp.status_code == 404

    def test_portfolio_summary(self, client, auth_token):
        create = client.post(
            f"/api/projects?token={auth_token}",
            json={"name": "Portfolio", "description": "", "cell_ids": [], "tags": []},
        )
        pid = create.json()["id"]
        resp = client.get(f"/api/projects/{pid}/portfolio?token={auth_token}")
        assert resp.status_code == 200
        body = resp.json()
        assert "project" in body
        assert "cells" in body
        assert "summary" in body
        assert body["summary"]["count"] == 0


# ---------------------------------------------------------------------------
# Alerts
# ---------------------------------------------------------------------------

class TestAlerts:
    def test_get_alerts_returns_list(self, client):
        resp = client.get("/api/alerts")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)


# ---------------------------------------------------------------------------
# Error handling
# ---------------------------------------------------------------------------

class TestErrorHandling:
    def test_report_not_found_returns_404(self, client):
        resp = client.get("/api/report/FAKE_CELL_ID")
        assert resp.status_code == 404

    def test_compare_not_found_returns_404(self, client):
        resp = client.get("/api/compare?cell_a=FAKE_A&cell_b=FAKE_B")
        assert resp.status_code == 404
