import express from 'express'
import graphqlHTTP from 'express-graphql'

import { MongoClient } from 'mongodb';
import jwt from 'express-jwt';
import schema from './schema';
import auth from './utils/auth';

const MONGO_URL = 'mongodb://localhost:27017/graphql-news';

const start = async () => {
  const app = express();
  await MongoClient.connect(MONGO_URL, { promiseLibrary: Promise, useUnifiedTopology: true })
    .catch(err => console.error(err.stack))
    .then(client => {
      const res = client.db('graphql-news');
      const db = {
        Links: res.collection('links'),
        Users: res.collection('users'),
        Comments: res.collection('comments'),
      };
      const buildOptions = async req => {
        const user = await auth(req, db.Users);
        return {
          context: { db, user },
          schema,
          graphiql: true,
        }
      };
      app.use(
        '/graphql',
        jwt({
          secret:'token-example@gmail.com',
          requestProperty:'auth',
          credentialsRequired:false,
        })
      );
      app.use('/graphql', graphqlHTTP(buildOptions));


      app.listen(4000, () => console.log('🏃‍♂️ server is running on port 4000'));
    })
};
start();