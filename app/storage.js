// All data stay in this browser (localStorage) until the researcher downloads them.
// Keys: synapse.sessions (index), synapse.session.<id> (one session), synapse.protocols (saved protocols).

const INDEX = 'synapse.sessions';
const PROTOCOLS = 'synapse.protocols';

const read = (key, fallback) => {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
};
const write = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch (e) {
    alert('The browser storage is full. Download and delete old sessions on the Data page, then continue.');
    return false;
  }
};

export function listSessions() {
  return read(INDEX, []).map((id) => read(`synapse.session.${id}`, null)).filter(Boolean)
    .sort((a, b) => (a.started_at < b.started_at ? 1 : -1));
}

export const getSession = (id) => read(`synapse.session.${id}`, null);

export function saveSession(s) {
  const ids = read(INDEX, []);
  if (!ids.includes(s.id)) { ids.push(s.id); write(INDEX, ids); }
  return write(`synapse.session.${s.id}`, s);
}

export function deleteSession(id) {
  localStorage.removeItem(`synapse.session.${id}`);
  write(INDEX, read(INDEX, []).filter((x) => x !== id));
}

export const listProtocols = () => read(PROTOCOLS, []);

export function saveProtocol(p) {
  const all = listProtocols().filter((x) => x.id !== p.id);
  all.push(p);
  return write(PROTOCOLS, all);
}

export function deleteProtocol(id) {
  write(PROTOCOLS, listProtocols().filter((x) => x.id !== id));
}

export const getPref = (k, d) => read(`synapse.pref.${k}`, d);
export const setPref = (k, v) => write(`synapse.pref.${k}`, v);
