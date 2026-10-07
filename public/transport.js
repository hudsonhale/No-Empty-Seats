/* API keys and ticketing credentials never enter the browser. */
window.NES_TRANSPORT = async function(path, body) {
  const response = await fetch(path, {
    method: body === undefined ? 'GET' : 'POST',
    credentials: 'same-origin', cache: 'no-store',
    headers: body === undefined ? {} : {'Content-Type':'application/json'},
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const data = await response.json().catch(() => ({error:'The server returned an unreadable response.'}));
  if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : data.error?.message || 'That request could not be completed.');
  return data;
};
