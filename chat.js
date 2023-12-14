const Websocket = require('ws')
const fs = require('fs')
const https = require('https')

const requestListener = function (req, res) {
    if (req.method == 'GET'){
        if (req.url == '/'){
            res.writeHead(200, {'Content-Type': 'text/html'})
            let html = fs.readFileSync('html/index.html').toString()
            res.end(html)
        }
        if (req.url == '/2'){
            res.writeHead(200, {'Content-Type': 'text/html'})
            let html = fs.readFileSync('./html/index2.html').toString()
            res.end(html)
        }
        if (req.url == '/scr.js'){
            res.writeHead(200, {'Content-Type': 'text/javascript'})
            let html = fs.readFileSync('./html/scr.js').toString()
            res.end(html)
        }
        if (req.url.startsWith('/files/')){
            DownloadFiles(req.url,res)
        }
        return
    } //get
    if (req.method == 'POST'){
		let data = ''
		req.on('data', function(chunk) {
			data += chunk
		})

		req.on('end', function() {
			if (req.url == '/getfull'){
                res.writeHead(200, {'Content-Type': 'text/html'})
                fs.readFile('db/'+data, function(error,data){
                    if(error) {  // если возникла ошибка
                        res.end('')
                        return;
                    }
                    res.end(data.toString());   // выводим считанные данные
                });
			}
            if (req.url == '/clear'){
                res.writeHead(200, {'Content-Type': 'text/html'})
                fs.unlink('db/'+data, err => {
                    if(err) res.end('0'); // не удалось удалить файл
                    res.end('1')
                 });
			}
        })
    }
}


const options = {
    key: fs.readFileSync('html/key.pem'),
    cert: fs.readFileSync('html/cert.pem'),
};


const Httpsserver = https.createServer(options,requestListener);
Httpsserver.listen(8888, '127.0.0.1', () => {
    console.log(`Server is running on https://127.0.0.1:8888`);
})


const wss = new Websocket.Server({server: Httpsserver})

const group = {}
const heartBeatTime = 50000


wss.on('connection', function (ws) {
  ws.isAlive = true
  ws.heartBeatTimeIntervalObj = -1
  ws.heartBeatTimeoutObj = -1

  // Listen to the heartbeat timer, if there is no heartbeat for a long time, it will automatically disconnect
  const setHeartBeatTimeout = () => {
    if (ws.heartBeatTimeoutObj !== -1) {
      clearTimeout(ws.heartBeatTimeoutObj)
      ws.heartBeatTimeoutObj = -1
    }
    ws.heartBeatTimeoutObj = setTimeout(() => {
      ws.close()
      ws.isAlive = false
    }, heartBeatTime)
  }

  setHeartBeatTimeout()

  ws.on('message', function (message) {
    //console.log('server receive message: ', message.toString())
    const data = JSON.parse(message.toString())

    setHeartBeatTimeout()
    if (data.event === 'login') {
      ws.enterInfo = data
    }

    if (data.event === 'heartBeat' && data.content === 'ping') {
      ws.isAlive = true

      if (ws.heartBeatTimeoutObj === -1) {
        clearTimeout(ws.heartBeatTimeoutObj)
        ws.heartBeatTimeoutObj = -1
      }
      
      setHeartBeatTimeout()

      ws.send(JSON.stringify({
        event: 'heartBeat',
        content: 'pong',
      }))
      return
    }

    if (typeof ws.roomId === 'undefined' && data.roomId) {
      ws.roomId = data.roomId
      if (typeof group[ws.roomId] === 'undefined') {
        group[ws.roomId] = 1
      } else {
        group[ws.roomId]++
      }
    }

    if (data.roomId && data.content){
        let text = `{ "date" : ${data.date},"userName": "${data.userName}", "content": "${data.content}"}\n`
        fs.appendFileSync('db/'+data.roomId, text)
    }

    data.num = group[ws.roomId]
    wss.clients.forEach(client => {
      if (client.readyState === Websocket.OPEN && client.roomId === ws.roomId) {
        client.send(JSON.stringify(data))
      }
    })
  })

  ws.on('close', function (message) {
    group[ws.roomId]--

    wss.clients.forEach(function each (client) {
      if (client !== ws && client.readyState === Websocket.OPEN && client.roomId === ws.roomId) {
        client.send(JSON.stringify({
          ...ws.enterInfo,
          event: 'logout',
          num: group[ws.roomId],
        }))
      }
    })
  })
})