const ws = new WebSocket('ws://localhost:3001/ws')
ws.addEventListener('open', () => {
  console.log('connected')
  ws.send(JSON.stringify({ type: 'GO_NO_GO', payload: { system: 'GUIDANCE', status: 'GO' } }))
})
ws.addEventListener('message', (e) => {
  console.log('received:', e.data)
})
setTimeout(() => process.exit(0), 1000)
