function success(res, data, statusCode = 200) {
  return res.status(statusCode).json({ ok: true, data });
}

function fail(res, message, statusCode = 400) {
  return res.status(statusCode).json({ ok: false, message });
}

module.exports = { success, fail };