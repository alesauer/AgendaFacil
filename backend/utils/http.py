from flask import jsonify


def success(data, status_code: int = 200):
    return jsonify({"success": True, "data": data}), status_code


def error(message: str, status_code: int = 400, code: str | None = None, details: dict | None = None):
    payload = {"success": False, "error": message}
    if code:
        payload["code"] = code
    if details is not None:
        payload["details"] = details
    return jsonify(payload), status_code
