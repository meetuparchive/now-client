// @flow

import { getMainDefinition } from 'apollo-utilities';
import { split, concat } from 'apollo-link';
import { createUploadLink } from 'apollo-upload-client';
import { WebSocketLink } from 'apollo-link-ws';
import apolloLogger from 'apollo-link-logger';
import type { ApolloLink } from 'apollo-link';

const buildLinks = (
  httpUrl: string,
  wsUrl: string,
  debug?: boolean
): ApolloLink => {
  const httpLink = createUploadLink({
    uri: httpUrl,
  });

  const wsLink = new WebSocketLink({
    uri: wsUrl,
    options: {
      reconnect: true,
      lazy: true,
    },
  });

  return {
    externalLink: split(
      ({ query }) => {
        const { kind, operation } = getMainDefinition(query);
        return kind === 'OperationDefinition' && operation === 'subscription';
      },
      wsLink,
      debug ? concat(apolloLogger, httpLink) : httpLink
    ),
    wsLink,
    httpLink,
  };
};

export default buildLinks;
