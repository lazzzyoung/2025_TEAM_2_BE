const router = require('express').Router()
const bcrypt = require('bcrypt');
const { ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken'); 
const axios = require('axios'); 
let connectDB = require('./../database.js')
require('dotenv').config();

let db
connectDB.then((client)=>{
  db = client.db('triangle')
  // console.log('auth DB연결성공')
}).catch((err)=>{
  // console.log(err)
}) 


 // 학교 인증 메일 요청 API
router.post('/univ-cert-request', async (req, res) => {
   const { email } = req.body;
 
   if (!email) {
     return res.status(400).json({ message: '이메일을 입력해주세요.' });
   }
 
   try {
     const univName = '경희대학교';
     const response = await axios.post('https://univcert.com/api/v1/certify', {
       key: process.env.UNIAPI_KEY, 
       email,
       univName,
       univ_check: true,
     });
 
     if (response.data.success) {
      
      
       return res.status(200).json({ 
         message: '인증 코드가 전송되었습니다.',
         
       });
     } else {
      // console.log('인증 코드 전송 실패')
       return res.status(400).json({ message: response.data.message || '인증 요청 실패' });
     }
   } catch (error) {
    //  console.error('인증 요청 오류:', error.response?.data || error.message);
     res.status(500).json({ message: '서버 오류 발생' });
   }
 });
 

router.post('/univ-cert-verify', async (req, res) => {
  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(400).json({ message: '이메일, 학교 이름, 인증 코드를 모두 입력해주세요.' });
  }

  try {
    const univName = '경희대학교';
    const response = await axios.post('https://univcert.com/api/v1/certifycode', {
      key: process.env.UNIAPI_KEY,
      email,
      univName,
      code,
    });

    if (response.data.success) {
      
      let user = await db.collection('users').findOne({ email });

      if (!user) {
        
        const newUser = {
          email,
          school: [univName, null, 'defaultMajor', true], 
          username: 'defaultUsername',
          password: 'defaultPassword', 
          gender: 'defaultGender', 
          nickname: 'defaultNickname', 
          icon: null,
          likedBy_list: [],
          mylike_list: [],
          block_list: [],
          created_at: new Date(),
        };

        
        const result = await db.collection('users').insertOne(newUser);

        
        return res.status(201).json({
          message: '학교 인증 완료 및 사용자 정보 생성!',
        });
      } else {
        return res.status(400).json({ message: '이미 존재하는 사용자입니다.' });
      }
    } else {
      
      return res.status(400).json({ message: '인증 코드가 잘못되었습니다.' });
    }
  } catch (error) {
    // console.error('학교 인증 오류:', error.response?.data || error.message);
    res.status(500).json({ message: '서버 오류 발생' });
    }
  });

 // 회원가입 API
router.post('/register', async (req, res) => {
   const {
     username,
     password,
     studentId,
     major,
     gender,
     nickname,
     icon,
     email,
   } = req.body;
 
   
   if (
     !username ||
     !password ||
     !studentId ||
     !major ||
     !gender ||
     !nickname ||
     !email ||
     icon === undefined 
   ) {
     return res.status(400).json({ message: '모든 필드를 입력해주세요.' });
   }
 
   try {
     
     const saltRounds = 10;
     const hashedPassword = await bcrypt.hash(password, saltRounds);
 
      
     const user = await db.collection('users').findOne({ email });

     if (!user) {
       return res.status(400).json({ message: '사용자가 존재하지 않습니다.' });
     }
 
     
     const result = await db.collection('users').updateOne(
       { _id: user._id },  
       {
         $set: {
           username,
           password: hashedPassword,
           school: [user.school[0], parseInt(studentId, 10), major, true],  
           gender,
           nickname,
           icon,
           created_at: new Date(),  
         },
       }
     );
 
     if (result.matchedCount === 0) {
       return res.status(400).json({ message: '사용자를 찾을 수 없습니다.' });
     }
 
    
    
    return res.status(200).json({
      message: '회원가입이 완료되었습니다.',
    });
  } catch (error) {
    // console.error('회원가입 오류:', error);
    res.status(500).json({ message: '서버 오류 발생' });
  }
 });
 
// 로그인 API
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  
  if (!email || !password) {
    return res.status(400).json({ message: '아이디와 비밀번호를 입력해주세요.' });
  }

  try {
    
    const user = await db.collection('users').findOne({ email });

    if (!user) {
      return res.status(401).json({ message: '아이디 또는 비밀번호가 잘못되었습니다.' });
    }

    
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: '아이디 또는 비밀번호가 잘못되었습니다.' });
    }

    
    const token = jwt.sign({ userId: user._id, email: user.email }, process.env.JWT_SECRET, {
      expiresIn: '5d',
    });

    
    return res.status(200).json({
      message: '로그인 성공',
      token,
      userId: user._id,
    });
  } catch (error) {
    // console.error('로그인 오류:', error);
    res.status(500).json({ message: '서버 오류' });
  }
});

router.post('/logout', (req, res) => {
  // 클라이언트에게 로그아웃 처리 안내
  return res.status(200).json({ message: '로그아웃 되었습니다.' });
});

 

module.exports = router 