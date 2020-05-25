import {
    GraphQLID,
    GraphQLObjectType,
    GraphQLSchema,
    GraphQLString,
    GraphQLList,
    GraphQLNonNull,
    GraphQLInputObjectType,
} from 'graphql';
import { ObjectID } from 'mongodb';
import { compareSync, hashSync } from 'bcrypt';

const userType = new GraphQLObjectType({
    name: 'User',
    fields: () => ({
        _id: { type: GraphQLID },
        username: { type: GraphQLString },
        about: { type: GraphQLString },
    }),
})

const commentsType = new GraphQLObjectType({
    name: 'Comments',
    fields: () => ({
        _id: { type: GraphQLID },
        link: {
            type: linkType,
            resolve: async ({ link }, data, { db: { Links } }) =>
                await Links.findOne(ObjectID(link)),
        },
        parent: {
            type: commentsType,
            resolve: async ({ parent }, data, { db: { Comments } }) =>
                await Comments.findOne(ObjectID(parent)),
        },
        comments: {
            type: new GraphQLList(commentsType),
            args: {
                _id: { type: GraphQLID },
            },
            resolve: async ({ _id }, data, { db: { Comments } }) => {
                const comments = await Comments.find({}).toArray();
            },

        },
        author: {
            type: userType,
            args: {
                author: { type: GraphQLID },
            },
            resolve: ({ author }) => find(users, { _id: author }),
        },
        content: {
            type: GraphQLString,
        },
    }),
})

const linkType = new GraphQLObjectType({
    name: 'Link',
    fields: () => ({
        _id: { type: GraphQLID },
        url: { type: GraphQLString },
        description: { type: GraphQLString },
        author: {
            type: userType,
            args: {
                author: { type: GraphQLID },
            },
            resolve: async (_, { author }, { db: { Users } }) =>
                await Users.findOne(ObjectID(author)),
        },
        comments: {
            type: new GraphQLList(commentsType),
            resolve: async ({ _id }, data, { db: { Comments } }) =>
                await Comments.find({ parent: ObjectID(_id) }).toArray(),
        },
        score: { type: GraphQLNonNull(GraphQLID) },
    }),
})

const queryType = new GraphQLObjectType({
    name: 'Query',
    fields: () => ({
        allLinks: {
            type: new GraphQLList(linkType),
            resolve: async (_, data, { db: { Links } }) =>
                await Links.find({}).toArray(),
        },
        link: {
            type: linkType,
            args: {
                _id: { type: GraphQLID },
            },
            resolve: async (_id, data, { db: { Links } }) =>
                await Links.findOne(ObjectID(_id)),
        },
        allUsers: {
            type: new GraphQLList(userType),
            resolve: async (_, data, { db: { Users } }) =>
                await Users.find({}).toArray(),
        },
        user: {
            type: userType,
            args: {
                _id: { type: GraphQLID },
            },
            resolve: async (_id, data, { db: { Users } }) =>
                await Users.findOne(ObjectID(_id)),
        },
    }),
});

const mutationType = new GraphQLObjectType({
    name: 'Mutation',
    fields: () => ({
        
        upvoteLink: {
            type: linkType,
            args: {
                _id: { type: GraphQLNonNull(GraphQLID) },
            },
            resolve: async (_, { _id }, { db: { Links } }) => {
                await Links.update({ _id: ObjectID(_id) }, { $inc: { score: 1 } });
                return Links.findOne(ObjectID(_id));

            }
        },
        downvoteLink: {
            type: linkType,
            args: {
                _id: { type: GraphQLNonNull(GraphQLID) },
            },
            resolve: async (_, { _id }, { db: { Links } }) => {
                await Links.update({ _id: ObjectID(_id) }, { $inc: { score: -1 } });
                return Links.findOne(ObjectID(_id));

            }
        },
        createLink: {
            type: linkType,
            args: {
                // No empty URLs
                url: { type: new GraphQLNonNull(GraphQLString) },
                description: { type: GraphQLString },
            },
            
            resolve: async (_, data, { db: { Links, user } }) => {
                if (user) {
                    const link = Object.assign(
                        {
                            author: user && user._id,
                            score: 0,
                            comments: [],
                        },
                        data
                    );
                    const res = await Links.insert(link);
                    return Object.assign({ _id: res.insertedIds[0] }, data);

                }
                return null;
            },
        },       
        createUser: {
            type: userType,
            args: {
                username: { type: new GraphQLNonNull(GraphQLString) },
                authProvider: { type: new GraphQLNonNull(provider) },
            },
            resolve: async (_, { username, authProvider }, { db: { Users } }) => {
                const password = hashSync(authProvider.password, 10);
                const newUser = {
                    username,
                    email: authProvider.email,
                    password: password,
                };
                const response = await Users.insert(newUser);

                return Object.assign({ _id: response.insertedIds[0] }, newUser);

            }
        },
        signInUser: {
            type: userType,
            args: {
                authProvider: { type: new GraphQLNonNull(provider) },
            },
            resolve: async (_, { authProvider }, { db: { Users } }) => {
                const user = await Users.findOne({ email: authProvider.email });
                if (compareSync(authProvider.password, user.password)) {
                    return Object.assign({ token: `token-${user.email}` }, user);
                }
                return null;

            }
        }

    })
});
const provider = new GraphQLInputObjectType({
    name: 'authProvider',
    fields: {
        email: { type: new GraphQLNonNull(GraphQLString) },
        password: { type: new GraphQLNonNull(GraphQLString) },
    }
});
const schema = new GraphQLSchema({ query: queryType, mutation: mutationType });

export default schema;