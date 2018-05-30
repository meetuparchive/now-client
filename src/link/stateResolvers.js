// @flow

const resolvers: any = {
  Query: {
    auth: () => ({
      __typename: 'Auth',
      token: null,
      refreshToken: null,
      isLoggedIn: false,
    }),
  },
  Mutation: {
    updateAuth: (root, { token, refreshToken }, { cache }) => {
      const data = {
        auth: {
          __typename: 'Auth',
          token: token || null,
          refreshToken: refreshToken || null,
          isLoggedIn: !!token,
        },
      };
      cache.writeData({ data });
      return data.auth;
    },
  },
};

export default resolvers;
