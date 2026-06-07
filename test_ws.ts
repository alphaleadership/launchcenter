const ws = new WebSocket('ws://localhost:3001/ws'); ws.onopen = () => console.log('connected'); ws.onmessage = (e) => console.log(e.data); setTimeout(() => process.exit(0), 1000);
