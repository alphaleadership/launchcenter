const ws = new WebSocket('ws://localhost:3001/ws')
ws.addEventListener('message', (e) => console.log(e.data))
setTimeout(() => process.exit(0), 1000)
