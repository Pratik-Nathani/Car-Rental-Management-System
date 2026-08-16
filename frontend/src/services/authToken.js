// Small module-level bridge between AuthContext (React state, scoped per tab) and the
// axios interceptor in api.js (plain JS, outside the React tree). Each browser tab keeps
// its own copy of this value in memory, so an Admin tab and a Customer tab open at the
// same time in the same browser never fight over which token to send — see AuthContext.jsx
// for how sessions are kept separate per role in localStorage too.
let currentToken = null

export function setAuthToken(token) {
  currentToken = token
}

export function getAuthToken() {
  return currentToken
}
