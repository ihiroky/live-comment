const http = require('http')
const fs = require('fs')

const server = http.createServer(function(request, response) {
  const text = request.url.endsWith('/main.js')
    ? fs.readFileSync('main.js')
    : fs.readFileSync('index.html')
  response.writeHead(200, {'Content-Type': 'text/html'})
  response.end(text)
})

fs.mkdirSync('dist/bundle', { recursive: true }, err => { if (err) console.log(err) })
const wd = './dist/bundle'
process.chdir(wd)
server.listen(8081)
setTimeout(() => {
  console.log(`Start server on http://localhost:8081/ at ${wd}`)
}, 1000)
