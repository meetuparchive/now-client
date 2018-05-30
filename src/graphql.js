// @flow
/* eslint-disable import/prefer-default-export */
import gql from 'graphql-tag';

export const getAuth = gql`
  query getAuth {
    auth @client {
      token
      refreshToken
      isLoggedIn
    }
  }
`;
