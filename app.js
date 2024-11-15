const express = require('express');
const app = express();
const session = require('express-session');
const fs = require('fs');


const cors = require('cors');
//로컬설정
const allowedOrigins = [
  'https://web-vuedepoytest-m3cudz5w505940d1.sel4.cloudtype.app', // 현재 프론트엔드 도메인
  'https://web-vuenode-m3cudz5w505940d1.sel4.cloudtype.app' // 추가 도메인
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
}));

app.use(cors(corsOption)); // CORS 미들웨어 추가
// app.use(express.json())
app.use(session({
    secret: 'secret code',
    resave: false,
    saveUninitialized: false,
    //로컬설정
    cookie: {
        secure: false,
        maxAge: 1000 * 60 * 60 //쿠키 유효시간 1시간
    }
    //배포시
//     cookie: {
//         secure: process.env.NODE_ENV === 'production', // 환경에 따라 secure 설정 (배포 시 HTTPS 사용)
//         maxAge: 1000 * 60 * 60 // 1시간
//       }
}));

// 바디로 요청할때 웹서버에서 받을려면 
app.use(express.json({
    limit: '5mb'
}));


const db = {
    database: "vueuser",
    connectionLimit: 10,
    host: "svc.sel4.cloudtype.app",
    port:31929,
    user: 'root',
    password: "dla2318"
};

const dbPool = require('mysql').createPool(db);

const server = app.listen(3000, () => {
    console.log('Server started. port 3000.');
});

let sql = require('./sql.js');
const { error } = require('console');
fs.watchFile(__dirname + '/sql.js', (curr, prev) => {
    console.log('sql변경시 재시작 없이 반영');
    delete require.cache[require.resolve('./sql.js')];
    sql = require('./sql.js');
})

app.post('/api/login', async (request, res) =>{
    try{
        const param = request.body.param;
        //res.send(await req.db('signUp', request.body.param)); // alias: sql.js에서 키값 , post방식의 파라미터 전달받는형식  request.body.param
        for (var info in param) {

            request.session[info] = param[info];
        }
        console.log("Session data",request.session);
        res.send('ok');
    } catch(err) {
        res.status(500).send({
            error:err
        })
    }
    
});

app.post('/upload/:productId/:type/:fileName', async (request, res) => {

    let {
      productId,
      type,
      fileName
    } = request.params;
    const dir = `${__dirname}/uploads/${productId}`;
    const file = `${dir}/${fileName}`;
    if (!request.body.data) return fs.unlink(file, async (err) => res.send({
      err
    }));
    const data = request.body.data.slice(request.body.data.indexOf(';base64,') + 8);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    fs.writeFile(file, data, 'base64', async (error) => {
      await req.db('productImageInsert', [{
        product_id: productId,
        p_type: type,
        path: fileName
      }]);
  
      if (error) {
        res.send({
          error
        });
      } else {
        res.send("ok");
      }
    });
  });
  
  app.get('/download/:productId/:fileName', (request, res) => {
    const {
      productId,
      type,
      fileName
    } = request.params;
    console.log("filename",fileName)
    const filepath = `${__dirname}/uploads/${productId}/${fileName}`;
    res.header('Content-Type', `image/${fileName.substring(fileName.lastIndexOf(".")+1)}`);
    if (!fs.existsSync(filepath)) res.send(404, {
      error: 'Can not found file.'
    });
    else fs.createReadStream(filepath).pipe(res);
  });

app.post('/api/logout', (request, res) =>{
    request.session.destroy((err) =>{
        if(err){
            return request.status(500).send({error: 'Failed to log out'});
        }
        res.send('ok');
    });
});


app.post('/api/:alias', async (request, res) => {
    try{
        res.send(await req.db(request.params.alias, request.body.param)); // alias: sql.js에서 키값 , post방식의 파라미터 전달받는형식  request.body.param

    } catch(err) {
        res.status(500).send({
            error:err
        })
    }
});

app.post('/apirole/:alias', async (request, res) => {
    if(!request.session.email) {
        return res.status(401).send({error:'You need to login'})
    }
    try{
        res.send(await req.db(request.params.alias));

    } catch(err) {
        res.status(500).send({
            error:err
        })
    }
});

const req = {
    async db(alias, param = [], where = '') {
      return new Promise((resolve, reject) => dbPool.query(sql[alias].query + where, param, (error, rows) => {
        if (error) {
          if (error.code != 'ER_DUP_ENTRY')
            console.log(error);
          resolve({
            error
          });
        } else resolve(rows);
      }));
    }
  };
