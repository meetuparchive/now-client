// @flow
import { ApolloLink } from 'apollo-link';
import gql from 'graphql-tag';

const middlewareLink = new ApolloLink((operation, forward) => {
  const { cache } = operation.getContext();
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
  if (response.auth.token) {
    operation.setContext({
      headers: {
        authorization: `Bearer ${response.auth.token}`,
      },
    });
  }
  return forward(operation);
});

export default middlewareLink;
