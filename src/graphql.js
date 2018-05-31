// @flow
/* eslint-disable import/prefer-default-export */
import gql from 'graphql-tag';

import type { ApolloCache } from 'apollo-cache';

export const authQuery = gql`
  query getAuth {
    auth @client {
      token
      refreshToken
      isLoggedIn
    }
  }
`;

const defaultAuth = {
  __typename: 'Auth',
  token: null,
  refreshToken: null,
  isLoggedIn: false,
};

export const getAuth = (cache: ApolloCache) => {
  try {
    const response = cache.readQuery({
      query: authQuery,
    });
    return response.auth || defaultAuth;
  } catch (e) {
    return defaultAuth;
  }
};
