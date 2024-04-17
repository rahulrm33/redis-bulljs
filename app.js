const { createBullBoard } = require('@bull-board/api');
const { BullAdapter } = require('@bull-board/api/bullAdapter');
const { ExpressAdapter } = require('@bull-board/express');
const  Queue  = require('bull');
const express = require('express');
const jwt = require('jsonwebtoken');
const cookieParser = require("cookie-parser");
const Redis = require('ioredis');
const config = require('config');

const redisConfig = config.get('redis');
console.log(redisConfig)
const redisCluster = new Redis.Cluster(redisConfig.nodes, redisConfig.options);


const verifyToken = (req, res, next) => {
  const token = req.cookies;
  if (!token || !token.accessToken) {
    return res.status(401).json({ message: 'Token is required' });
  }
  console.log("##"+process.env.NODE_ENV+"###")

  try {
    const decoded = jwt.verify(token.accessToken, config.get("secret"));
    console.log(decoded);
    req.accessLevel = decoded.role; 
      if (req.accessLevel === 'root' && req.originalUrl === '/') {
        return res.redirect('/ui-readwrite');
      }
      if (req.accessLevel === 'developer' && req.originalUrl === '/') {
        return res.redirect('/ui-readonly');
      }
      next();
  }catch (err) {  
    return res.redirect(config.get("redirectURL"));
  }
};

const run = async () => {
  const app = express();
  app.use(cookieParser());
  app.use(verifyToken);
  const queueNames = config.get('queueNames');
  const queues = {};
  queueNames.forEach(queueName => {
    queues[queueName] = new Queue(`{${queueName}}`, {
      createClient: function (type) {
        return redisCluster;
      },
      prefix:config.get('prefix')
    });
  });
  console.log("%%%");
  console.log(config.get('queueNames'))
  console.log("%%%");
  const serverAdapterReadOnly = new ExpressAdapter();
  const serverAdapterReadWrite = new ExpressAdapter();

  serverAdapterReadOnly.setBasePath('/ui-readonly');
  serverAdapterReadWrite.setBasePath('/ui-readwrite');

  const bullAdaptersRO = Object.values(queues).map(queue => new BullAdapter(queue,{ readOnlyMode: true }));
  const bullAdaptersRW = Object.values(queues).map(queue => new BullAdapter(queue,{ readOnlyMode: false }));
  
  createBullBoard({
    queues: bullAdaptersRO,
    serverAdapter: serverAdapterReadOnly,
  });

  createBullBoard({
    queues: bullAdaptersRW,
    serverAdapter: serverAdapterReadWrite,
  });

  app.use('/ui-readonly', (req, res, next) => {
    if (req.accessLevel !== 'developer') {
      return res.status(403).json({ message: 'Readonly access required' });
    }
    next();
  }, serverAdapterReadOnly.getRouter());

  app.use('/ui-readwrite', (req, res, next) => {
    if (req.accessLevel !== 'root') {
      return res.status(403).json({ message: 'Readwrite access required' });
    }
    next();
  }, serverAdapterReadWrite.getRouter());

  const PORT_READONLY = 4000;

  app.listen(PORT_READONLY, () => {
    console.log(`Read-only Bull Board UI running on port ${PORT_READONLY}...`);
    console.log('For the UI, open http://localhost:4000/ui-readonly');
  });

  console.log('Make sure Redis is running on port 6379 by default');
  console.log('To populate the queue, run:');
  console.log('  curl http://localhost:4000/add?title=Example');
  console.log('To populate the queue with custom options (opts), run:');
  console.log('  curl http://localhost:4000/add?title=Test&opts[delay]=9');
};

run().catch((e) => console.error(e));