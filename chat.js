const Websocket = require('ws')
const fs = require('fs')
const https = require('http')

const requestListener = function (req, res) {
    if (req.method == 'GET'){
        if (req.url == '/'){
            res.writeHead(200, {'Content-Type': 'text/html'})
            let html = fs.readFileSync('html/index.html').toString()
            res.end(html)
        }
        if (req.url == '/scr.js'){
            res.writeHead(200, {'Content-Type': 'text/javascript'})
            let html = fs.readFileSync('./html/scr.js').toString()
            res.end(html)
        }
        if (req.url == '/sound.mp3'){
          fs.readFile('html/sound.mp3', function (error, data) {
              if (error) {
                  res.statusCode = 404;
                  res.end('Resourse not found!');
              } else {
                  res.end(data);
                  return
              }
          })
        }
        if (req.url == '/favicon.ico'){
          fs.readFile('html/favicon.ico', function (error, data) {
            if (error) {
                res.statusCode = 404;
                res.end('Resourse not found!');
            } else {
                res.end(data);
                return
            }
          })
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
Httpsserver.listen(8080, () => {
    console.log(`Server is running on https://______:8080`);
})


const wss = new Websocket.Server({server: Httpsserver})

const group = {}


wss.on('connection', function (ws) {

  ws.on('message', function (message) {
    //console.log('server receive message: ', message.toString())
    const data = JSON.parse(message.toString())

    if (data.event === 'login') {
      ws.enterInfo = data
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
        // try {
        //   fs.accessSync( 'db' , fs.constants.F_OK);
        // } catch (err) {
        //     fs.mkdir('db', (error) => {console.error(error)});
        // }
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
