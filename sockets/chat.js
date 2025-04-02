const { Server } = require('socket.io');
const { ObjectId } = require('mongodb');

// 이 함수는 server.js에서 불러와 실행될 예정
function setupChatSocket(server, db) {
  const io = new Server(server, {
    cors: {
      origin: '*', // 개발 중 허용
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    console.log(`✅ WebSocket 연결됨: ${socket.id}`);

    // 그룹 채팅방 입장
    socket.on('joinRoom', (groupId) => {
      socket.join(groupId);
      console.log(`🚪 ${socket.id}님이 그룹 ${groupId} 채팅방에 입장함`);
    });

    // 메시지 전송
    socket.on('sendMessage', async ({ groupId, userId, nickname, message }) => {
      const time = new Date();

      const chat = {
        groupId: new ObjectId(groupId),
        userId: new ObjectId(userId),
        nickname,
        message,
        time
      };

      try {
        // MongoDB에 메시지 저장 (messages 컬렉션)
        await db.collection('messages').insertOne(chat);
      } catch (err) {
        console.error('❌ 메시지 저장 실패:', err);
      }

      // 같은 그룹에 속한 사용자들에게 메시지 전송
      io.to(groupId).emit('receiveMessage', {
        userId,
        nickname,
        message,
        time
      });
    });

    socket.on('disconnect', () => {
      console.log(`❎ 연결 종료: ${socket.id}`);
    });
  });
}

module.exports = setupChatSocket;
