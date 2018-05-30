// @flow

import { ApolloClient } from 'apollo-client';
import { ApolloLink } from 'apollo-link';
import { withClientState } from 'apollo-link-state';
import { TokenRefreshLink } from 'apollo-link-token-refresh';
import { InMemoryCache } from 'apollo-cache-inmemory';
import { CachePersistor } from 'apollo-cache-persist';
import { RetryLink } from 'apollo-link-retry';

import AuthLink from './link/AuthLink';
import ExternalLink from './link/ExternalLink';
import ErrorLink from './link/ErrorLink';
import stateResolvers from './link/stateResolvers';
import { getAuth } from './graphql';

type PersistentStorage<T> = {
  getItem: (key: string) => Promise<T> | T,
  setItem: (key: string, data: T) => Promise<void> | void,
  removeItem: (key: string) => Promise<void> | void,
};

type Config = {
  httpUrl: string,
  wsUrl: string,
  debug: boolean,
  storage: PersistentStorage<*>,
  doRefreshToken: (
    refreshToken: ?string
  ) => { accessToken: ?string, refreshToken?: ?string },
  doLogin: (
    username: ?string,
    password: ?string
  ) => Promise<{ accessToken: ?string, refreshToken?: ?string }>,
  additionalLinks: Array<ApolloLink>,
  additionalStateResolvers: any,
};

type Data = {
  auth: {
    __typename: string,
    token?: ?string,
    refreshToken?: ?string,
    isLoggedIn?: boolean,
  },
};

class NowClient extends ApolloClient {
  config: Config;

  constructor(config: Config) {
    const cache = new InMemoryCache();

    const refreshLink = new TokenRefreshLink({
      accessTokenField: 'tokens',
      isTokenValidOrUndefined: () => {
        const response = cache.readQuery({ query: getAuth });
        const valid = typeof response.auth.token === 'string';
        return valid;
      },
      fetchAccessToken: () => {
        const response = cache.readQuery({ query: getAuth });

        return config.doRefreshToken(response.auth.refreshToken);
      },
      handleFetch: ({ accessToken, refreshToken }) => {
        if (this) {
          this.updateToken(accessToken, refreshToken);
        }
      },
      handleResponse: () => ({ accessToken }) => {
        const response = cache.readQuery({ query: getAuth });
        return {
          data: {
            tokens: { refreshToken: response.auth.refreshToken, accessToken },
          },
        };
      },
      handleError: () => {
        if (this) {
          this.logout();
        }
      },
    });
    const { externalLink, wsLink } = ExternalLink(
      config.httpUrl,
      config.wsUrl,
      config.debug
    );

    const retryLink = new RetryLink();
    const stateLink = withClientState({
      resolvers: Object.assign(
        {},
        stateResolvers,
        config.additionalStateResolvers
      ),
      cache,
    });

    /*
    * Our link chain:
    * 1. retry link, catches network errors and retries
    * 2. Errors - unset access token on 401
    * 3. Local state
    * 4. Check refresh token
    * 5. Add auth header
    * 6. Additional links from config
    * 7. External link, http or ws
    */
    const links = [
      retryLink,
      ErrorLink,
      stateLink,
      refreshLink,
      AuthLink,
      ...(config.additionalLinks || []),
      externalLink,
    ];

    const link = ApolloLink.from(links);

    super({ link, cache });

    this.config = config;
    this.wsLink = wsLink;
    this.persistor = new CachePersistor({
      cache,
      storage: config.storage,
      debug: config.debug,
    });
  }

  onWsReconnected = (callback: () => void, context?: any) =>
    this.wsLink.subscriptionClient.onReconnected(callback, context);

  updateToken = (token: ?string, refreshToken: ?string) => {
    if (this.config.debug && token) {
      console.log('GraphiQL', `http://localhost:3000/graphiql?token=${token}`); // eslint-disable-line no-console
    }

    const query = getAuth;

    let data: Data = {
      auth: { __typename: 'Auth' },
    };

    try {
      data = this.cache.readQuery({
        query,
      });
    } catch (e) {
      // We can't read it if it's the first time
    }

    const { auth } = data || {
      auth: {
        __typename: 'Auth',
      },
    };

    auth.token = token;
    auth.refreshToken = refreshToken;
    auth.isLoggedIn = !!token;

    this.cache.writeQuery({ query, data: { auth } });
    this.updateWsToken(token);
  };

  updateWsToken = (token: ?string) => {
    const wsClient = this.wsLink.subscriptionClient;
    if (wsClient.connectionParams.token === token) {
      return;
    }
    wsClient.connectionParams.token = token;
    wsClient.close(true, true);
  };

  restoreCache = (): Promise<void> =>
    this.persistor
      .restore()
      .then(() => this.readQuery({ query: getAuth }))
      .then(({ auth: { token } }) => {
        this.updateWsToken(token);
      })
      .catch(() => {});

  setLogoutCallBack = (callback: () => void) => {
    this.logoutCallback = callback;
  };

  login = (username: string, password: string): Promise<void> =>
    this.config
      .doLogin(username, password)
      .then(({ accessToken, refreshToken }) =>
        this.updateToken(accessToken, refreshToken)
      );

  logout = (): Promise<void> => {
    // https://github.com/apollographql/apollo-cache-persist/issues/34#issuecomment-371177206
    this.persistor.pause();
    return this.persistor
      .purge()
      .then(() => this.updateToken(null, null))
      .then(() => {
        this.persistor.resume();
      })
      .then(() => this.resetStore())
      .catch(
        () =>
          // catch any errors so we still logout
          undefined
      )
      .then(() => {
        this.logoutCallback();
      });
  };
}

export default NowClient;
