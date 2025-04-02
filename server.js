const express = require('express')
const axios = require('axios'); 
const jwt = require('jsonwebtoken'); 
const bcrypt = require('bcrypt');
const { ObjectId } = require('mongodb');
const http = require('http'); 
const setupChatSocket = require('./sockets/chat'); // ✅ chat socket 분리 파일
require('dotenv').config();

const app = express()
const port = process.env.PORT

const server = http.createServer(app); // ✅ socket.io용 http 서버 생성

let connectDB = require('./database.js')
let db

connectDB.then((client) => {
  db = client.db('triangle')

  // ✅ WebSocket 붙이기
  setupChatSocket(server, db)

  server.listen(port, () => {
    console.log('서버연결성공')
  })

  // ❌ server.listen은 안 씀 — app.listen 유지하기 위해
}).catch((err) => {
  console.log(err)
})

app.get('/', (req, res) => {
  res.send("서버 잘 돌아가는중")
})

app.use(express.json());
app.use('/auth', require('./routes/auth.js'))
app.use('/user', require('./routes/user.js'))
app.use('/group', require('./routes/group.js'))