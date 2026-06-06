const WebSocket = require('ws')
const ws = new WebSocket('ws://localhost:3001/ws')
ws.on('open', () => {
  console.log('connected')
  ws.send(JSON.stringify({ type: 'GO_NO_GO', payload: { system: 'GUIDANCE', status: 'GO' } }))
})
ws.on('message', (m) => console.log(m.toString()))
setTimeout(() => process.exit(0), 1000)
