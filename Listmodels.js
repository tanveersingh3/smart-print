fetch('https://generativelanguage.googleapis.com/v1beta/models?key=AQ.Ab8RN6K_CJ4CGHnwCS2DwvOZHgo6e2BvxDd5-LK2uua3Rey8kg')
.then(r => r.json())
.then(d => {
  if(d.models) d.models.forEach(m => console.log(m.name));
  else console.log(JSON.stringify(d, null, 2));
})
.catch(e => console.log('ERROR:', e.message));