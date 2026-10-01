function createHealthResponse() {
  return {
    status: 200,
    jsonBody: {
      ok: true,
      service: 'stmichael-church-admin-api'
    }
  };
}

module.exports = { createHealthResponse };
