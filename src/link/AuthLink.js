// @flow
import { ApolloLink } from 'apollo-link';
import gql from 'graphql-tag';

const middlewareLink = new ApolloLink((operation, forward) => {
  const context = operation.getContext();
  const { cache } = context;
  let { authToken: token } = context;
  if (cache && !token) {
    const query = gql`
      query {
        auth @client {
          token
        }
      }
    `;
    const response = cache.readQuery({
      query,
    });
    token = response.auth.token; // eslint-disable-line prefer-destructuring
  }
  if (token) {
    operation.setContext({
      headers: {
        authorization: `Bearer ${token}`,
      },
    });
  }
  return forward(operation);
});

export default middlewareLink;
