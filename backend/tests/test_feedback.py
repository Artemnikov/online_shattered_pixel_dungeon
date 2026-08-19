import asyncio
from unittest.mock import patch, MagicMock
from app.api.routes import send_feedback, FeedbackRequest
import pytest
from fastapi import HTTPException


def test_feedback_not_configured(monkeypatch):
    monkeypatch.delenv("TELEGRAM_BOT_TOKEN", raising=False)
    monkeypatch.delenv("TELEGRAM_CHAT_ID", raising=False)

    req = FeedbackRequest(feedback_type="good", message="Great game!")
    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(send_feedback(req))
    assert exc_info.value.status_code == 503
    assert "not configured" in exc_info.value.detail


def test_feedback_empty_message(monkeypatch):
    monkeypatch.setenv("TELEGRAM_BOT_TOKEN", "fake_token")
    monkeypatch.setenv("TELEGRAM_CHAT_ID", "123456")

    req = FeedbackRequest(feedback_type="good", message="   ")
    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(send_feedback(req))
    assert exc_info.value.status_code == 400
    assert "cannot be empty" in exc_info.value.detail


@patch("urllib.request.urlopen")
def test_feedback_success_text(mock_urlopen, monkeypatch):
    monkeypatch.setenv("TELEGRAM_BOT_TOKEN", "fake_token")
    monkeypatch.setenv("TELEGRAM_CHAT_ID", "123456")

    mock_resp = MagicMock()
    mock_resp.status = 200
    mock_resp.__enter__.return_value = mock_resp
    mock_urlopen.return_value = mock_resp

    req = FeedbackRequest(
        feedback_type="good",
        message="Love this feature!",
        contact="@player1",
        context="MainMenu",
    )
    res = asyncio.run(send_feedback(req))

    assert res == {"success": True}
    assert mock_urlopen.called


@patch("urllib.request.urlopen")
def test_feedback_success_photo(mock_urlopen, monkeypatch):
    monkeypatch.setenv("TELEGRAM_BOT_TOKEN", "fake_token")
    monkeypatch.setenv("TELEGRAM_CHAT_ID", "123456")

    mock_resp = MagicMock()
    mock_resp.status = 200
    mock_resp.__enter__.return_value = mock_resp
    mock_urlopen.return_value = mock_resp

    fake_png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="

    req = FeedbackRequest(
        feedback_type="bad",
        message="Found a bug on floor 3",
        context="InGame (Floor 3)",
        screenshot=fake_png,
    )
    res = asyncio.run(send_feedback(req))

    assert res == {"success": True}
    assert mock_urlopen.called

