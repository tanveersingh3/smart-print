fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=AQ.Ab8RN6K_CJ4CGHnwCS2DwvOZHgo6e2BvxDd5-LK2uua3Rey8kg', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ contents: [{ parts: [{ text: 'say hello' }] }] })
})
.then(r => r.json())
.then(d => console.log(JSON.stringify(d, null, 2)))
.catch(e => console.log('ERROR:', e.message));