const fs = require('fs')
const https = require('http')


let msgs = {}

const requestListener = function (req, res) {
  if (req.method == 'GET') {
    if (req.url == '/') {
      res.writeHead(200, { 'Content-Type': 'text/html' })
      let html = fs.readFileSync('html/index.html').toString()
      res.end(html)
    }
    if (req.url == '/scr.js') {
      res.writeHead(200, { 'Content-Type': 'text/javascript' })
      let html = fs.readFileSync('./html/scr.js').toString()
      res.end(html)
    }
    return
  } //get
  if (req.method == 'POST') {
    let data = ''
    req.on('data', function (chunk) {
      data += chunk
    })

    req.on('end', function () {
      if (req.url == '/send') {
        res.writeHead(200, { 'Content-Type': 'application/json;charset=utf-8' })
        try {
          let message = JSON.parse(data)
          SendMsg(message)
          res.end('1')
        } catch (e) {
          res.end('0')
        }
      }
      if (req.url == '/check') {
        res.writeHead(200, { 'Content-Type': 'application/json;charset=utf-8' })
        try {
          let message = JSON.parse(data)
          res.end(CheckMsg(message))
        } catch (e) {
          res.end('0')
        }
        
      }
      if (req.url == '/clear') {
        res.writeHead(200, { 'Content-Type': 'text/html' })
        try {
          msgs[data] = []
          res.end('1')
        } catch {
          res.end('0');
        }
      }
    })
  }
}

const options = {
  key: fs.readFileSync('html/key.pem'),
  cert: fs.readFileSync('html/cert.pem'),
};

const httpsserver = https.createServer( requestListener);
httpsserver.listen(8080, () => {
  console.log(`Server is running on https://______:8080`);
})


function SendMsg(message){
  if (message.event == 'login'){
    if (msgs[message.roomId] == undefined) msgs[message.roomId] = []
  }
  if (message.event == 'message'){
    msgs[message.roomId].push(message)
  }
}

function CheckMsg(message){
  if (message.event != 'check') return '0'
  let msg = []
  let msgdata = msgs[message.roomId]
  msgdata.forEach((m)=>{
    if (m.date>message.date) msg.push(m)
  })
  return JSON.stringify(msg)
}
