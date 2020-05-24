import express from 'express'
import graphqlHTTP from 'express-graphql'
import schema from './schema';
import { MongoClient } from 'mongodb';

const MONGO_URL = 'mongodb://localhost:27017/graphql-news';

const start = async () => {
  const app = express();
  await MongoClient.connect(MONGO_URL, { promiseLibrary: Promise,useUnifiedTopology:true })
    .catch(err => console.error(err.stack))
    .then(client => {
      const res = client.db('graphql-news');
      const db = {
        Links: res.collection('links'),
        Users: res.collection('users'),
        Comments: res.collection('comments'),
      };
      const buildOptions = {
        context: { db },
        schema,
        graphiql: true,        
      };
      app.use('/graphql', graphqlHTTP(buildOptions));


      app.listen(4000, () => console.log('🏃‍♂️ server is running on port 4000'));
    })
};
start();