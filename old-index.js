const { createBullBoard } = require('@bull-board/api');
const { BullMQAdapter } = require('@bull-board/api/bullMQAdapter');
const { ExpressAdapter } = require('@bull-board/express');
const { Queue: QueueMQ, Worker } = require('bullmq');
const express = require('express');

const sleep = (t) => new Promise((resolve) => setTimeout(resolve, t * 1000));

const redisOptions = {
  port: 6379,
  host: 'localhost',
  password: '',
  tls: false,
};

const createQueueMQ = (name) => new QueueMQ(name, { connection: redisOptions });

async function setupBullMQProcessor(queueName) {
  new Worker(queueName, async (job) => {
    for (let i = 0; i <= 100; i++) {
      await sleep(Math.random());
      await job.updateProgress(i);
      await job.log(`Processing job at interval ${i}`);

      if (Math.random() * 200 < 1) throw new Error(`Random error ${i}`);
    }

    return { jobId: `This is the return value of job (${job.id})` };
  }, { connection: redisOptions });
}

const run = async () => {
  const exampleBullMq = createQueueMQ('BullMQ');

  await setupBullMQProcessor(exampleBullMq.name);

  const app = express();

  const serverAdapterReadOnly = new ExpressAdapter();
  const serverAdapterReadWrite = new ExpressAdapter();

  serverAdapterReadOnly.setBasePath('/ui-readonly');
  serverAdapterReadWrite.setBasePath('/ui-readwrite');

  createBullBoard({
    queues: [new BullMQAdapter(exampleBullMq, { readOnlyMode: true })],
    serverAdapter: serverAdapterReadOnly,
  });

  createBullBoard({
    queues: [new BullMQAdapter(exampleBullMq, { readOnlyMode: false })],
    serverAdapter: serverAdapterReadWrite,
  });

  app.use('/ui-readonly', serverAdapterReadOnly.getRouter());
  app.use('/ui-readwrite', serverAdapterReadWrite.getRouter());

  app.use('/add', (req, res) => {
    const opts = req.query.opts || {};

    if (opts.delay) {
      opts.delay = +opts.delay * 1000; // delay must be a number
    }

    exampleBullMq.add('Add', { title: req.query.title }, opts);

    res.json({
      ok: true,
    });
  });

  const PORT_READONLY = 3001;
  // const PORT_READWRITE = 3002;

  app.listen(PORT_READONLY, () => {
    console.log(`Read-only Bull Board UI running on port ${PORT_READONLY}...`);
    console.log('For the UI, open http://localhost:3001/ui-readonly');
  });

  // app.listen(PORT_READWRITE, () => {
  //   console.log(`Read-write Bull Board UI running on port ${PORT_READWRITE}...`);
  //   console.log('For the UI, open http://localhost:3002/ui-readwrite');
  // });

  console.log('Make sure Redis is running on port 6379 by default');
  console.log('To populate the queue, run:');
  console.log('  curl http://localhost:3001/add?title=Example');
  console.log('To populate the queue with custom options (opts), run:');
  console.log('  curl http://localhost:3001/add?title=Test&opts[delay]=9');
};

run().catch((e) => console.error(e));




// ----------------- Two Port - One has readonlymode true / Another port to readOnlyMode false ----
// const { createBullBoard } = require('@bull-board/api');
// const { BullMQAdapter } = require('@bull-board/api/bullMQAdapter');
// const { ExpressAdapter } = require('@bull-board/express');
// const { Queue: QueueMQ, Worker } = require('bullmq');
// const express = require('express');

// const sleep = (t) => new Promise((resolve) => setTimeout(resolve, t * 1000));

// const redisOptions = {
//   port: 6379,
//   host: 'localhost',
//   password: '',
//   tls: false,
// };

// const createQueueMQ = (name) => new QueueMQ(name, { connection: redisOptions });

// async function setupBullMQProcessor(queueName) {
//   new Worker(queueName, async (job) => {
//     for (let i = 0; i <= 100; i++) {
//       await sleep(Math.random());
//       await job.updateProgress(i);
//       await job.log(`Processing job at interval ${i}`);

//       if (Math.random() * 200 < 1) throw new Error(`Random error ${i}`);
//     }

//     return { jobId: `This is the return value of job (${job.id})` };
//   }, { connection: redisOptions });
// }

// const run = async () => {
//   const exampleBullMq = createQueueMQ('BullMQ');

//   await setupBullMQProcessor(exampleBullMq.name);

//   const app = express();

//   const serverAdapterReadOnly = new ExpressAdapter();
//   const serverAdapterReadWrite = new ExpressAdapter();

//   serverAdapterReadOnly.setBasePath('/ui-readonly');
//   serverAdapterReadWrite.setBasePath('/ui-readwrite');

//   createBullBoard({
//     queues: [new BullMQAdapter(exampleBullMq, { readOnlyMode: true })],
//     serverAdapter: serverAdapterReadOnly,
//   });

//   createBullBoard({
//     queues: [new BullMQAdapter(exampleBullMq, { readOnlyMode: false })],
//     serverAdapter: serverAdapterReadWrite,
//   });

//   app.use('/ui-readonly', serverAdapterReadOnly.getRouter());
//   app.use('/ui-readwrite', serverAdapterReadWrite.getRouter());

//   app.use('/add', (req, res) => {
//     const opts = req.query.opts || {};

//     if (opts.delay) {
//       opts.delay = +opts.delay * 1000; // delay must be a number
//     }

//     exampleBullMq.add('Add', { title: req.query.title }, opts);

//     res.json({
//       ok: true,
//     });
//   });

//   const PORT_READONLY = 3001;
//   const PORT_READWRITE = 3002;

//   app.listen(PORT_READONLY, () => {
//     console.log(`Read-only Bull Board UI running on port ${PORT_READONLY}...`);
//     console.log('For the UI, open http://localhost:3001/ui-readonly');
//   });

//   app.listen(PORT_READWRITE, () => {
//     console.log(`Read-write Bull Board UI running on port ${PORT_READWRITE}...`);
//     console.log('For the UI, open http://localhost:3002/ui-readwrite');
//   });

//   console.log('Make sure Redis is running on port 6379 by default');
//   console.log('To populate the queue, run:');
//   console.log('  curl http://localhost:3000/add?title=Example');
//   console.log('To populate the queue with custom options (opts), run:');
//   console.log('  curl http://localhost:3000/add?title=Test&opts[delay]=9');
// };

// run().catch((e) => console.error(e));


//-------------------- Normal - Code --------------------------------

// const { createBullBoard } = require('@bull-board/api');
// const { BullMQAdapter } = require('@bull-board/api/bullMQAdapter');
// const { ExpressAdapter } = require('@bull-board/express');
// const { Queue: QueueMQ, Worker } = require('bullmq');
// const express = require('express');

// const sleep = (t) => new Promise((resolve) => setTimeout(resolve, t * 1000));

// const redisOptions = {
//   port: 6379,
//   host: 'localhost',
//   password: '',
//   tls: false,
// };

// const createQueueMQ = (name) => new QueueMQ(name, { connection: redisOptions });

// async function setupBullMQProcessor(queueName) {
//   new Worker(queueName, async (job) => {
//     for (let i = 0; i <= 100; i++) {
//       await sleep(Math.random());
//       await job.updateProgress(i);
//       await job.log(`Processing job at interval ${i}`);

//       if (Math.random() * 200 < 1) throw new Error(`Random error ${i}`);
//     }

//     return { jobId: `This is the return value of job (${job.id})` };
//   }, { connection: redisOptions });
// }

// const run = async () => {
//   const exampleBullMq = createQueueMQ('BullMQ');

//   await setupBullMQProcessor(exampleBullMq.name);

//   const app = express();

//   const serverAdapter = new ExpressAdapter();
//   serverAdapter.setBasePath('/ui');

//   createBullBoard({
//     queues: [new BullMQAdapter(exampleBullMq, { readOnlyMode: true })],
//     serverAdapter,
//   });

//   createBullBoard({
//     queues: [new BullMQAdapter(exampleBullMq, { readOnlyMode: false })],
//     serverAdapter,
//   });

//   app.use('/ui', serverAdapter.getRouter());

//   app.use('/add', (req, res) => {
//     const opts = req.query.opts || {};

//     if (opts.delay) {
//       opts.delay = +opts.delay * 1000; // delay must be a number
//     }

//     exampleBullMq.add('Add', { title: req.query.title }, opts);

//     res.json({
//       ok: true,
//     });
//   });

//   app.listen(3000, () => {
//     console.log('Running on 3000...');
//     console.log('For the UI, open http://localhost:3000/ui');
//     console.log('Make sure Redis is running on port 6379 by default');
//     console.log('To populate the queue, run:');
//     console.log('  curl http://localhost:3000/add?title=Example');
//     console.log('To populate the queue with custom options (opts), run:');
//     console.log('  curl http://localhost:3000/add?title=Test&opts[delay]=9');

//     console.log('  curl http://localhost:3000/add?title=hey&opts[delay]=9');
//   });
// };

// // eslint-disable-next-line no-console
// run().catch((e) => console.error(e));